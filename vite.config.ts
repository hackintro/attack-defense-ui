import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  define: {
    // plotly.js bundles deps that reference Node's `global`. Vite 8 no
    // longer polyfills it for the browser, so we alias it to `globalThis`
    // (which is the same thing and exists in every modern browser/Node).
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/status': {
        target: 'https://ctf.hackintro.di.uoa.gr',
        changeOrigin: true,
      },
    },
  },
});
