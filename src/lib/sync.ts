import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { db } from './db';
import { decryptJSON, deriveKey, encryptJSON } from './crypto';

/**
 * Optional, opt-in cloud sync. Everything is encrypted client-side before it
 * leaves the device (see crypto.ts) — Supabase stores only ciphertext keyed by
 * the user's id. Conflicts resolve last-write-wins on the record's own
 * `updatedAt`, which lives *inside* the ciphertext, so the server's timestamps
 * can never influence the merge.
 */

export type SyncItemType = 'settings' | 'cycle' | 'period_log' | 'daily_log';

/** Settings live under the fixed local key 'user'; the table needs a uuid. */
const SETTINGS_SYNC_ID = '00000000-0000-4000-8000-000000000001';

const TABLE_NAME: Record<SyncItemType, string> = {
  settings: 'settings',
  cycle: 'cycles',
  period_log: 'periodLogs',
  daily_log: 'dailyLogs',
};

interface SyncableRecord {
  id: string;
  updatedAt: string;
  [key: string]: unknown;
}

const table = (type: SyncItemType) => db.table<SyncableRecord, string>(TABLE_NAME[type]);

const localIdFor = (type: SyncItemType, itemId: string) =>
  type === 'settings' ? 'user' : itemId;

const remoteIdFor = (type: SyncItemType, localId: string) =>
  type === 'settings' ? SETTINGS_SYNC_ID : localId;

function requireClient() {
  if (!supabase) throw new Error('Sync na nuvem não está configurado neste app.');
  return supabase;
}

/* ------------------------------------------------------------------ auth --- */

export async function getUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/**
 * Email + passphrase backup — NO email is ever sent. The email is only an
 * account identifier; the passphrase authenticates and (separately, via
 * PBKDF2) derives the client-side encryption key. First use creates the account
 * and signs in; another device signs in with the same email + passphrase.
 *
 * This deliberately avoids magic links / one-time codes, which on a free static
 * PWA are unreliable (rate-limited built-in email, non-editable templates,
 * redirect-URL pitfalls).
 */
export async function signInWithPassphrase(
  email: string,
  passphrase: string,
): Promise<{ user: User; isNew: boolean }> {
  const client = requireClient();
  const e = email.trim().toLowerCase();

  // Existing account → this is a (re)connect, likely a restore on a new device.
  const signIn = await client.auth.signInWithPassword({ email: e, password: passphrase });
  if (signIn.data?.user) return { user: signIn.data.user, isNew: false };

  // Supabase can't distinguish "no such user" from "wrong password", so try to
  // create the account. With email confirmation off, a brand-new signup returns
  // a live session; an existing email returns a user with no session — meaning
  // the account exists and the passphrase was simply wrong.
  const signUp = await client.auth.signUp({ email: e, password: passphrase });
  if (signUp.error) throw signUp.error;
  if (signUp.data.session && signUp.data.user) return { user: signUp.data.user, isNew: true };
  throw new Error('Senha incorreta para este e-mail.');
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

/**
 * Guarantee a session without demanding an email login. Used by partner sharing:
 * if she is already signed in (email sync), reuse it; otherwise create a
 * lightweight anonymous session so the share has an owner for RLS. One tap, no
 * inbox required.
 */
export async function ensureSession(): Promise<User> {
  const client = requireClient();
  const existing = await getUser();
  if (existing) return existing;
  const { data, error } = await client.auth.signInAnonymously();
  if (error) throw error;
  if (!data.user) throw new Error('Não foi possível iniciar a sessão de compartilhamento.');
  return data.user;
}

/* ------------------------------------------------------------------ sync --- */

export interface SyncResult {
  pushed: number;
  pulled: number;
}

async function collectLocal(): Promise<Array<{ type: SyncItemType; record: SyncableRecord }>> {
  const out: Array<{ type: SyncItemType; record: SyncableRecord }> = [];
  for (const type of Object.keys(TABLE_NAME) as SyncItemType[]) {
    const rows = await table(type).toArray();
    for (const record of rows) out.push({ type, record });
  }
  return out;
}

/** Write the remote record locally when it is strictly newer (or on overwrite). */
async function mergeLocal(
  type: SyncItemType,
  remote: SyncableRecord,
  overwrite: boolean,
): Promise<boolean> {
  const t = table(type);
  const local = await t.get(remote.id);
  if (overwrite || !local || (remote.updatedAt ?? '') > (local.updatedAt ?? '')) {
    await t.put(remote);
    return true;
  }
  return false;
}

/** Full two-way sync: pull-and-merge, then push everything back encrypted. When
 * `overwrite` is set (restoring on a new device) the cloud copy always wins. */
export async function syncNow(
  passphrase: string,
  opts: { overwrite?: boolean } = {},
): Promise<SyncResult> {
  const client = requireClient();
  const user = await getUser();
  if (!user) throw new Error('Entre com seu e-mail para sincronizar.');

  const key = await deriveKey(passphrase, user.id);

  // ---- pull
  const { data: rows, error } = await client
    .from('sync_items')
    .select('item_id,item_type,ciphertext,nonce,deleted')
    .eq('user_id', user.id);
  if (error) throw error;

  let pulled = 0;
  for (const row of rows ?? []) {
    const type = row.item_type as SyncItemType;
    if (row.deleted) {
      await table(type).delete(localIdFor(type, row.item_id as string));
      continue;
    }
    // A wrong passphrase throws here — surfaced to the user, nothing is written.
    const record = await decryptJSON<SyncableRecord>(key, {
      ciphertext: row.ciphertext as string,
      nonce: row.nonce as string,
    });
    if (await mergeLocal(type, record, opts.overwrite ?? false)) pulled++;
  }

  // ---- push
  const items = await collectLocal();
  const payload = await Promise.all(
    items.map(async ({ type, record }) => {
      const env = await encryptJSON(key, record);
      return {
        user_id: user.id,
        item_id: remoteIdFor(type, record.id),
        item_type: type,
        ciphertext: env.ciphertext,
        nonce: env.nonce,
        deleted: false,
      };
    }),
  );

  if (payload.length) {
    const { error: upsertError } = await client
      .from('sync_items')
      .upsert(payload, { onConflict: 'user_id,item_id' });
    if (upsertError) throw upsertError;
  }

  return { pushed: payload.length, pulled };
}
