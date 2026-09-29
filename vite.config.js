import { defineConfig } from 'vite';

export default defineConfig({
  // Solo se publica index.html (lab.html y fonts.html quedan para desarrollo).
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
  worker: {
    format: 'es',
  },
});
