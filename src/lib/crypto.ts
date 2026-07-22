/**
 * Client-side end-to-end encryption for optional cloud sync.
 *
 * The encryption key is derived from a passphrase the user knows and NEVER
 * leaves the device — it is not stored, not uploaded, and not recoverable by
 * the server. Supabase only ever receives AES-GCM ciphertext it cannot read.
 *
 * Key derivation: PBKDF2-SHA256, 310k iterations (OWASP guidance), salted with
 * the user's Supabase user id. A salt must be unique per user, not secret —
 * the user id satisfies that and needs no extra storage, so the passphrase
 * alone unlocks the data on any device.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

export const PBKDF2_ITERATIONS = 310_000;

export interface Envelope {
  /** base64 AES-GCM ciphertext */
  ciphertext: string;
  /** base64 96-bit nonce/IV, unique per record write */
  nonce: string;
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return fromBase64(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
}

/**
 * A fresh random key for one partner-share link. It is NOT derived from the
 * user's passphrase — a shared link must never be able to unlock her own data.
 * The exported key travels only in the URL fragment, which browsers never send
 * to a server.
 */
export async function generateShareKey(): Promise<{ key: CryptoKey; exported: string }> {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
  return { key, exported: toBase64Url(raw) };
}

/** Rebuild a share key from the fragment. Decrypt-only on the partner's side. */
export async function importShareKey(exported: string, usages: KeyUsage[] = ['decrypt']) {
  return crypto.subtle.importKey('raw', fromBase64Url(exported), { name: 'AES-GCM' }, false, usages);
}

/** Derive the AES-GCM key from the user's passphrase. Non-extractable. */
export async function deriveKey(passphrase: string, salt: string): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptJSON(key: CryptoKey, value: unknown): Promise<Envelope> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const data = enc.encode(JSON.stringify(value));
  const buf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, data);
  return { ciphertext: toBase64(new Uint8Array(buf)), nonce: toBase64(nonce) };
}

/** Throws if the passphrase is wrong or the payload was tampered with (AEAD). */
export async function decryptJSON<T>(key: CryptoKey, envelope: Envelope): Promise<T> {
  const buf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(envelope.nonce) },
    key,
    fromBase64(envelope.ciphertext),
  );
  return JSON.parse(dec.decode(buf)) as T;
}
