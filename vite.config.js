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
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        },
    }
  }
})
