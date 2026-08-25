/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' keeps the static build portable to any host / subpath (GitHub Pages).
// The worker (src/worker/om.worker.ts) imports openmalaria-wasm directly;
// Vite resolves the wasm binary as an asset via the package's own
// `new URL('openMalaria.wasm', import.meta.url)` — no manual copy step needed.
export default defineConfig({
  base: './',
  plugins: [react()],
  worker: {
    format: 'es',
  },
  server: {
    // openmalaria-wasm is a `file:` dependency resolved (via symlink) to a
    // sibling repo outside this project root. Vite's dev server otherwise
    // 403s requests for files outside root (e.g. the wasm binary served via
    // `new URL('openMalaria.wasm', import.meta.url)`), which only surfaces
    // at runtime in a real browser — the production build is unaffected
    // since Rollup inlines the asset into dist/ at build time.
    fs: {
      allow: ['.', '../openmalaria-wasm-port'],
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
