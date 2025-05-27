import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    proxy: {
      '/status': {
        target: 'https://ctf.hackintro25.di.uoa.gr',
        changeOrigin: true,
      },
    }
  }
})
