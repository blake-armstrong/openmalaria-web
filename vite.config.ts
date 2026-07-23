/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' keeps the static build portable to any host / subpath (GitHub Pages).
// The wasm glue + binary are served from public/wasm and loaded at runtime by the
// worker (see src/worker/om.worker.ts), so they stay out of Vite's module graph.
export default defineConfig({
  base: './',
  plugins: [react()],
  worker: {
    format: 'es',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
