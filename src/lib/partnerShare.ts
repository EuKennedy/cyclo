import { format } from 'date-fns';
import { supabase } from './supabase';
import { db, type PartnerShareRef, type SettingsRecord } from './db';
import { decryptJSON, encryptJSON, generateShareKey, importShareKey } from './crypto';
import { USER_ID } from './settings';
import { ensureSession, getUser } from './sync';
import { CYCLE } from '@/domain/constants';

/**
 * Partner sharing — an opt-in, revocable, permanent link.
 *
 * What travels: only the cycle "seed" (first name, last period start, average
 * lengths). NEVER symptoms, moods, notes or sexual activity. The partner view
 * recomputes today's phase from the seed, so the link stays accurate as days
 * pass without re-uploading anything.
 *
 * Two independent secrets guard it and the server holds neither in usable form:
 * the random token in the link, and the AES key, which lives only in the URL
 * fragment (never sent to any server).
 */

export interface SharePayload {
  name: string;
  /** YYYY-MM-DD */
  lastPeriodStart: string;
  avgCycleLength: number;
  avgPeriodLength: number;
  lutealLength: number;
  updatedAt: string;
}

/**
 * Links never expire — they stay valid until she revokes them. Postgres
 * `'infinity'` satisfies the server's `expires_at > now()` check forever, so
 * this needs no schema change on an existing database.
 */
export const SHARE_NEVER_EXPIRES = 'infinity';

export function buildShareUrl(ref: Pick<PartnerShareRef, 'token' | 'key'>): string {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`;
  return `${base}?p=${ref.token}#k=${ref.key}`;
}

export function buildSharePayload(settings: SettingsRecord, lastStart: Date): SharePayload {
  return {
    name: settings.name.trim().split(/\s+/)[0] ?? '',
    lastPeriodStart: format(lastStart, 'yyyy-MM-dd'),
    avgCycleLength: settings.avgCycleLength,
    avgPeriodLength: settings.avgPeriodLength,
    lutealLength: settings.lutealLengthOverride ?? CYCLE.LUTEAL_LENGTH,
    updatedAt: new Date().toISOString(),
  };
}

export async function createPartnerShare(payload: SharePayload): Promise<PartnerShareRef> {
  if (!supabase) throw new Error('O compartilhamento não está disponível neste momento.');
  const user = await ensureSession();

  const { key, exported } = await generateShareKey();
  const envelope = await encryptJSON(key, payload);

  const { data, error } = await supabase
    .from('partner_shares')
    .insert({
      user_id: user.id,
      ciphertext: envelope.ciphertext,
      nonce: envelope.nonce,
      expires_at: SHARE_NEVER_EXPIRES,
    })
    .select('token')
    .single();
  if (error) throw error;

  const ref: PartnerShareRef = {
    token: String(data.token),
    key: exported,
    createdAt: new Date().toISOString(),
  };
  await db.settings.update(USER_ID, { partnerShare: ref, updatedAt: new Date().toISOString() });
  return ref;
}

/** Keep the shared summary current. Safe to call on every app open. Also turns
 * links created back when they expired after 90 days into permanent ones. */
export async function refreshPartnerShare(ref: PartnerShareRef, payload: SharePayload): Promise<void> {
  if (!supabase) return;
  // Only the owning session can update the row; skip quietly otherwise so we
  // never mint stray anonymous users just to refresh.
  if (!(await getUser())) return;
  const key = await importShareKey(ref.key, ['encrypt']);
  const envelope = await encryptJSON(key, payload);
  await supabase
    .from('partner_shares')
    .update({
      ciphertext: envelope.ciphertext,
      nonce: envelope.nonce,
      expires_at: SHARE_NEVER_EXPIRES,
    })
    .eq('token', ref.token);
}

/** Kill the link immediately — the row (and its ciphertext) is deleted. */
export async function revokePartnerShare(ref: PartnerShareRef): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('partner_shares').delete().eq('token', ref.token);
    if (error) throw error;
  }
  await db.settings.update(USER_ID, { partnerShare: null, updatedAt: new Date().toISOString() });
}

/** Partner side: fetch by exact token (no enumeration) and decrypt locally. */
export async function fetchPartnerShare(token: string, keyB64: string): Promise<SharePayload> {
  if (!supabase) throw new Error('Este link não está disponível neste momento.');
  const { data, error } = await supabase.rpc('get_partner_share', { p_token: token });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as
    | { ciphertext: string; nonce: string }
    | undefined;
  if (!row) throw new Error('Este link foi revogado e não está mais disponível.');
  const key = await importShareKey(keyB64, ['decrypt']);
  return decryptJSON<SharePayload>(key, { ciphertext: row.ciphertext, nonce: row.nonce });
}
