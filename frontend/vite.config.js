import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      // Single-origin wiring: forward API + socket.io to the backend service
      '/api': {
        target: process.env.API_URL || 'http://server:8080',
        changeOrigin: true,
      },
      '/socket.io': {
        target: process.env.API_URL || 'http://server:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});