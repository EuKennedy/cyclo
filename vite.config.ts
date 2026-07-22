import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves a project site under /<repo>/. Override with VITE_BASE if the
// repository name differs. In dev/preview we serve from root for a clean localhost.
const BASE = process.env.VITE_BASE ?? '/cyclo/';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? BASE : '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Cyclo — seu ciclo, com clareza',
        short_name: 'Cyclo',
        description:
          'Acompanhamento de ciclo menstrual local-first, privado e sofisticado. Seus dados ficam no seu dispositivo.',
        lang: 'pt-BR',
        theme_color: '#050507',
        background_color: '#050507',
        display: 'standalone',
        orientation: 'portrait',
        categories: ['health', 'lifestyle', 'medical'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
}));
