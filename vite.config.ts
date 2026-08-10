import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { getWindPayload } from './server/gfsWind.mjs'

/** Dev implementation of the data-proxy routes the prod Express server owns. */
function windProxy(): Plugin {
  return {
    name: 'synoptic-wind-proxy',
    configureServer(server) {
      server.middlewares.use('/proxy/gfs-wind', (req, res) => {
        const level = new URL(req.url ?? '', 'http://x').searchParams.get('level') ?? '10m'
        getWindPayload(level)
          .then((payload) => {
            res.setHeader('Content-Type', 'application/octet-stream')
            res.setHeader('Cache-Control', 'public, max-age=600')
            res.end(payload)
          })
          .catch((e: unknown) => {
            res.statusCode = 502
            res.end(String(e))
          })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), windProxy()],
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
      // NEXRAD Level 2 real-time chunks (S3 bucket blocks browser CORS).
      '/proxy/nexrad': {
        target: 'https://unidata-nexrad-level2-chunks.s3.amazonaws.com',
        changeOrigin: true,
        rewrite: (path) => path.replace('/proxy/nexrad', ''),
      },
    },
  },
})
