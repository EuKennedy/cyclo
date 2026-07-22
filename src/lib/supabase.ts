import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, isSyncConfigured } from './env';

/**
 * Supabase client for OPT-IN, end-to-end-encrypted sync only. Null when sync is
 * not configured — the app runs entirely without it. The client is never used
 * to store plaintext health data; only AEAD ciphertext is ever uploaded.
 */
export const supabase: SupabaseClient | null = isSyncConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;
