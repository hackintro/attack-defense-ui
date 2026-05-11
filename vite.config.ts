import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

export default defineConfig({
  plugins: [react()],
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
    }
  }
})
