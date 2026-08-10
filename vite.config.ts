import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    // drei/fiber/three must resolve to a single copy each — duplicates
    // produce "invalid hook call" from a second bundled reconciler.
    dedupe: ['react', 'react-dom', 'three', '@react-three/fiber'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'],
  },
  server: {
    port: 5192,
    // Dev-time CORS shim for endpoints that block browser origins.
    // The production Express proxy serves the same /proxy/* routes.
    proxy: {
      '/proxy/metar': {
        target: 'https://aviationweather.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace('/proxy/metar', '/api/data/metar'),
      },
    },
  },
})
