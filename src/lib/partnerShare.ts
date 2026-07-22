import { addDays, format } from 'date-fns';
import { supabase } from './supabase';
import { db, type PartnerShareRef, type SettingsRecord } from './db';
import { decryptJSON, encryptJSON, generateShareKey, importShareKey } from './crypto';
import { USER_ID } from './settings';
import { getUser } from './sync';
import { CYCLE } from '@/domain/constants';

/**
 * Partner sharing — an opt-in, revocable, expiring link.
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

export const SHARE_DAYS = 90;

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
  if (!supabase) throw new Error('O compartilhamento precisa do backup na nuvem configurado.');
  const user = await getUser();
  if (!user) throw new Error('Entre com seu e-mail em "Backup na nuvem" para gerar o link.');

  const { key, exported } = await generateShareKey();
  const envelope = await encryptJSON(key, payload);
  const expiresAt = addDays(new Date(), SHARE_DAYS).toISOString();

  const { data, error } = await supabase
    .from('partner_shares')
    .insert({
      user_id: user.id,
      ciphertext: envelope.ciphertext,
      nonce: envelope.nonce,
      expires_at: expiresAt,
    })
    .select('token, expires_at')
    .single();
  if (error) throw error;

  const ref: PartnerShareRef = {
    token: String(data.token),
    key: exported,
    expiresAt: String(data.expires_at),
    createdAt: new Date().toISOString(),
  };
  await db.settings.update(USER_ID, { partnerShare: ref, updatedAt: new Date().toISOString() });
  return ref;
}

/** Keep the shared summary current. Safe to call on every app open. */
export async function refreshPartnerShare(ref: PartnerShareRef, payload: SharePayload): Promise<void> {
  if (!supabase) return;
  const key = await importShareKey(ref.key, ['encrypt']);
  const envelope = await encryptJSON(key, payload);
  await supabase
    .from('partner_shares')
    .update({ ciphertext: envelope.ciphertext, nonce: envelope.nonce })
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
  if (!row) throw new Error('Este link expirou ou foi revogado.');
  const key = await importShareKey(keyB64, ['decrypt']);
  return decryptJSON<SharePayload>(key, { ciphertext: row.ciphertext, nonce: row.nonce });
}
