import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server : {
    proxy: {
      '/api':{
        target: '${API_URL}/api/auth/register', //URL del servidor Node.js
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
