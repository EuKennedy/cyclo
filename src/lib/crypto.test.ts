// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  deriveKey,
  encryptJSON,
  decryptJSON,
  generateShareKey,
  importShareKey,
} from './crypto';

const SALT = '11111111-2222-3333-4444-555555555555';

describe('end-to-end encryption', () => {
  it('round-trips a record through encrypt/decrypt', async () => {
    const key = await deriveKey('uma senha forte', SALT);
    const record = { date: '2026-07-22', flow: 'medium', symptoms: ['Cólicas'] };
    const env = await encryptJSON(key, record);
    expect(env.ciphertext).toBeTypeOf('string');
    expect(env.nonce).toBeTypeOf('string');
    await expect(decryptJSON(key, env)).resolves.toEqual(record);
  });

  it('never stores plaintext in the envelope', async () => {
    const key = await deriveKey('uma senha forte', SALT);
    const env = await encryptJSON(key, { notes: 'menstruacao intensa' });
    expect(env.ciphertext).not.toContain('menstruacao');
    expect(atob(env.ciphertext)).not.toContain('menstruacao');
  });

  it('uses a fresh nonce per write', async () => {
    const key = await deriveKey('uma senha forte', SALT);
    const a = await encryptJSON(key, { x: 1 });
    const b = await encryptJSON(key, { x: 1 });
    expect(a.nonce).not.toEqual(b.nonce);
    expect(a.ciphertext).not.toEqual(b.ciphertext);
  });

  it('fails to decrypt with the wrong passphrase', async () => {
    const good = await deriveKey('senha certa', SALT);
    const bad = await deriveKey('senha errada', SALT);
    const env = await encryptJSON(good, { secret: true });
    await expect(decryptJSON(bad, env)).rejects.toThrow();
  });

  it('fails to decrypt when the ciphertext is tampered with', async () => {
    const key = await deriveKey('senha certa', SALT);
    const env = await encryptJSON(key, { secret: true });
    const bytes = atob(env.ciphertext).split('');
    bytes[0] = String.fromCharCode((bytes[0]!.charCodeAt(0) ^ 0xff) & 0xff);
    const tampered = { ...env, ciphertext: btoa(bytes.join('')) };
    await expect(decryptJSON(key, tampered)).rejects.toThrow();
  });

  it('share keys are URL-fragment safe and round-trip', async () => {
    const share = await generateShareKey();
    expect(share.exported).not.toMatch(/[+/=]/); // base64url — safe in a URL
    const env = await encryptJSON(share.key, { name: 'Bia', avgCycleLength: 28 });
    const imported = await importShareKey(share.exported);
    await expect(decryptJSON(imported, env)).resolves.toEqual({ name: 'Bia', avgCycleLength: 28 });
  });

  it('generates a distinct key per share link', async () => {
    const a = await generateShareKey();
    const b = await generateShareKey();
    expect(a.exported).not.toEqual(b.exported);
  });

  it('one share link cannot open another', async () => {
    const a = await generateShareKey();
    const b = await generateShareKey();
    const env = await encryptJSON(a.key, { secret: true });
    await expect(decryptJSON(await importShareKey(b.exported), env)).rejects.toThrow();
  });

  it('derives different keys for different users (salt)', async () => {
    const k1 = await deriveKey('mesma senha', 'user-a');
    const k2 = await deriveKey('mesma senha', 'user-b');
    const env = await encryptJSON(k1, { x: 1 });
    await expect(decryptJSON(k2, env)).rejects.toThrow();
  });
});
