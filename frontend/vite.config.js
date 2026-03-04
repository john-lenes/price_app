import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// When running locally with `npm run dev`, proxy API calls to the backend.
// In Docker, Nginx handles routing — this proxy is for dev only.
const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:8020'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
    },
  },
})
