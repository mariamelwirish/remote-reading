import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy API calls to the local backend so the browser talks same-origin
    // in dev — no CORS, and it no longer matters which port Vite picks.
    // Requires VITE_API_URL to be a relative path (e.g. "/api/v1") in .env.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
