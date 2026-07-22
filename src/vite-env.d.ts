/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Supabase project URL — only for opt-in E2EE sync. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon/public key — safe to ship only with RLS enabled. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Base path for GitHub Pages (defaults to /cyclo/ at build time). */
  readonly VITE_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
