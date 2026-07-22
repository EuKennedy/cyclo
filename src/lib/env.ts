/** Runtime configuration. Cyclo is fully functional with none of these set —
 * they only enable the opt-in, end-to-end-encrypted cloud sync. */
export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
} as const;

/** True only when both sync credentials are present. */
export const isSyncConfigured: boolean = Boolean(env.supabaseUrl && env.supabaseAnonKey);
