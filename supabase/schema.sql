-- Cyclo — Supabase schema for OPT-IN, end-to-end-encrypted sync/backup.
--
-- Design stance (see docs/RESEARCH-SPEC.md §7): the device is the source of
-- truth. This server is, at most, an encrypted relay. It stores ONLY ciphertext
-- that it cannot decrypt — the encryption key is derived client-side from the
-- user's passphrase and never leaves the device. Faced with a legal request,
-- the honest answer is that no readable reproductive-health data exists here.
--
-- What the server therefore never sees: cycle dates, flow, symptoms, moods,
-- sexual activity, pregnancy intent, or any health field in plaintext.
--
-- Run this in the Supabase SQL editor. Requires Supabase Auth enabled.

-- 1. Encrypted item store -----------------------------------------------------
-- Each row is one client-side-encrypted domain record (a settings blob, a cycle,
-- a period log, a daily symptom log). The app encrypts the record's JSON with an
-- AEAD cipher (XChaCha20-Poly1305 / AES-GCM) before upload. `item_type` and
-- timestamps are the only non-encrypted metadata, kept minimal by design.

create table if not exists public.sync_items (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  item_id     uuid        not null,               -- stable client-generated id
  item_type   text        not null check (item_type in ('settings', 'cycle', 'period_log', 'daily_log')),
  ciphertext  text        not null,               -- base64 AEAD ciphertext
  nonce       text        not null,               -- base64 per-record nonce/IV
  schema_ver  smallint    not null default 1,     -- envelope version for migrations
  deleted     boolean     not null default false, -- tombstone; hard-purged client-side
  updated_at  timestamptz not null default now(), -- last-write-wins conflict key
  primary key (user_id, item_id)
);

create index if not exists sync_items_user_updated_idx
  on public.sync_items (user_id, updated_at desc);

-- 2. Row Level Security -------------------------------------------------------
-- Every row is readable/writable ONLY by its owner. The anon key is safe to ship
-- in the client bundle precisely because these policies gate all access.

alter table public.sync_items enable row level security;

drop policy if exists "own rows: select" on public.sync_items;
create policy "own rows: select"
  on public.sync_items for select
  using (auth.uid() = user_id);

drop policy if exists "own rows: insert" on public.sync_items;
create policy "own rows: insert"
  on public.sync_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "own rows: update" on public.sync_items;
create policy "own rows: update"
  on public.sync_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own rows: delete" on public.sync_items;
create policy "own rows: delete"
  on public.sync_items for delete
  using (auth.uid() = user_id);

-- 3. Keep updated_at honest ---------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sync_items_touch on public.sync_items;
create trigger sync_items_touch
  before update on public.sync_items
  for each row execute function public.touch_updated_at();

-- 4. Partner sharing --------------------------------------------------------
-- An opt-in, revocable, expiring link that lets a partner see a SUMMARY of the
-- cycle (phase, countdown, fertile window, how to support) — never symptoms,
-- moods, notes or sexual activity.
--
-- Two independent secrets protect it, and the server holds neither in usable
-- form: (1) the random `token` in the link, and (2) the AES key, which travels
-- only in the URL *fragment* and is therefore never sent to any server.
-- The stored payload is the cycle "seed" (start date + lengths), so the partner
-- view recomputes today's phase locally and the link stays accurate over time.

create table if not exists public.partner_shares (
  token       uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  ciphertext  text        not null,
  nonce       text        not null,
  expires_at  timestamptz not null,
  revoked     boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists partner_shares_user_idx on public.partner_shares (user_id);

alter table public.partner_shares enable row level security;

-- Only the owner can create, inspect, revoke or delete her own shares.
drop policy if exists "own shares: select" on public.partner_shares;
create policy "own shares: select" on public.partner_shares for select
  using (auth.uid() = user_id);
drop policy if exists "own shares: insert" on public.partner_shares;
create policy "own shares: insert" on public.partner_shares for insert
  with check (auth.uid() = user_id);
drop policy if exists "own shares: update" on public.partner_shares;
create policy "own shares: update" on public.partner_shares for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own shares: delete" on public.partner_shares;
create policy "own shares: delete" on public.partner_shares for delete
  using (auth.uid() = user_id);

drop trigger if exists partner_shares_touch on public.partner_shares;
create trigger partner_shares_touch
  before update on public.partner_shares
  for each row execute function public.touch_updated_at();

-- Defence in depth: the partner (anon) must never touch this table directly.
-- RLS already denies it — auth.uid() is null — but revoking the grant makes
-- "no enumeration" a structural property instead of a policy detail.
revoke all on public.partner_shares from anon;

-- The partner is NOT authenticated. Rather than granting anon a table-wide
-- select (which would let anyone list every live share), expose a single
-- function that only ever returns the row for an exact token.
create or replace function public.get_partner_share(p_token uuid)
returns table (ciphertext text, nonce text, expires_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select s.ciphertext, s.nonce, s.expires_at
  from public.partner_shares s
  where s.token = p_token
    and s.revoked = false
    and s.expires_at > now()
$$;

revoke all on function public.get_partner_share(uuid) from public;
grant execute on function public.get_partner_share(uuid) to anon, authenticated;
