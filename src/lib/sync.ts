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

/** Email one-time code — avoids passwords and redirect URLs entirely. */
export async function sendLoginCode(email: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyLoginCode(email: string, token: string): Promise<User | null> {
  const client = requireClient();
  const { data, error } = await client.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'email',
  });
  if (error) throw error;
  return data.user ?? null;
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
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

/** Write the remote record locally when it is strictly newer. */
async function mergeLocal(type: SyncItemType, remote: SyncableRecord): Promise<boolean> {
  const t = table(type);
  const local = await t.get(remote.id);
  if (!local || (remote.updatedAt ?? '') > (local.updatedAt ?? '')) {
    await t.put(remote);
    return true;
  }
  return false;
}

/** Full two-way sync: pull-and-merge, then push everything back encrypted. */
export async function syncNow(passphrase: string): Promise<SyncResult> {
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
    if (await mergeLocal(type, record)) pulled++;
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
