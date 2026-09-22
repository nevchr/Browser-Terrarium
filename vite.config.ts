import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        dashboard: resolve(import.meta.dirname, 'dashboard.html'),
        popup: resolve(import.meta.dirname, 'popup.html'),
        onboarding: resolve(import.meta.dirname, 'onboarding.html'),
        serviceWorker: resolve(import.meta.dirname, 'src/background/serviceWorker.ts'),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'serviceWorker' ? 'serviceWorker.js' : 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
