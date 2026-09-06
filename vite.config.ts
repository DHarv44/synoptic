import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { getWindPayloadEncoded } from './server/gfsWind.mjs'
import { getGridPayload } from './server/gfsGrid.mjs'
import { getBuoysJson } from './server/ndbc.mjs'

// Surfaced in the About panel, so a bug report can name a build.
const { version } = createRequire(import.meta.url)('./package.json') as { version: string }

/** `valid` query (ISO or epoch ms) → epoch ms; absent or unparsable = now. */
function validParam(q: URLSearchParams): number {
  const raw = q.get('valid')
  if (raw === null) return Date.now()
  const ms = /^\d+$/.test(raw) ? Number(raw) : Date.parse(raw)
  return Number.isFinite(ms) ? ms : Date.now()
}

/** Dev implementation of the data-proxy routes the prod Express server owns. */
function windProxy(): Plugin {
  return {
    name: 'synoptic-wind-proxy',
    configureServer(server) {
      server.middlewares.use('/proxy/gfs-wind', (req, res) => {
        const q = new URL(req.url ?? '', 'http://x').searchParams
        const level = q.get('level') ?? '10m'
        const gzip = /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''))
        getWindPayloadEncoded(level, gzip, validParam(q))
          .then(({ buf, encoding }) => {
            res.setHeader('Content-Type', 'application/octet-stream')
            res.setHeader('Cache-Control', 'public, max-age=600')
            if (encoding) res.setHeader('Content-Encoding', encoding)
            res.end(buf)
          })
          .catch((e: unknown) => {
            res.statusCode = 502
            res.end(String(e))
          })
      })
      server.middlewares.use('/proxy/ndbc', (_req, res) => {
        getBuoysJson()
          .then((body) => {
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Cache-Control', 'public, max-age=300')
            res.end(body)
          })
          .catch((e: unknown) => {
            res.statusCode = 502
            res.end(String(e))
          })
      })
      server.middlewares.use('/proxy/gfs-grid', (req, res) => {
        const q = new URL(req.url ?? '', 'http://x').searchParams
        const field = q.get('field') ?? 'mslp'
        getGridPayload(field, validParam(q))
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
  define: { __APP_VERSION__: JSON.stringify(version) },
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
      // The rest of the AWC data API (SIGMETs, PIREPs, TAFs…).
      '/proxy/awc': {
        target: 'https://aviationweather.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace('/proxy/awc', '/api/data'),
      },
      // NEXRAD Level 2 real-time chunks (S3 bucket blocks browser CORS).
      '/proxy/nexrad': {
        target: 'https://unidata-nexrad-level2-chunks.s3.amazonaws.com',
        changeOrigin: true,
        rewrite: (path) => path.replace('/proxy/nexrad', ''),
      },
      // Smithsonian GVP volcano database (WFS; no CORS upstream).
      '/proxy/gvp': {
        target: 'https://webservices.volcano.si.edu',
        changeOrigin: true,
        rewrite: (path) => path.replace('/proxy/gvp', '/geoserver/GVP-VOTW/ows'),
      },
      // VAAC volcanic ash advisories, raw text bulletins (no CORS upstream).
      '/proxy/vaa': {
        target: 'https://tgftp.nws.noaa.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace('/proxy/vaa', '/data/raw/fv'),
      },
      // NHC active-storm list (no CORS upstream). Vite proxy keys match by
      // prefix, so this must not be a prefix of /proxy/nhc-gis.
      '/proxy/nhc-storms': {
        target: 'https://www.nhc.noaa.gov',
        changeOrigin: true,
        rewrite: () => '/CurrentStorms.json',
      },
      // NOAA tropical map service: per-storm track/cone/radii as GeoJSON.
      '/proxy/nhc-gis': {
        target: 'https://mapservices.weather.noaa.gov',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace('/proxy/nhc-gis', '/tropical/rest/services/tropical/NHC_tropical_weather/MapServer'),
      },
    },
  },
})
