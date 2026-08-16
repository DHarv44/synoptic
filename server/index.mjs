/**
 * Production server: the built app plus the `/proxy/*` routes it depends on.
 *
 * These routes are not optional. Two upstreams cannot be called from the
 * browser at all — the NEXRAD Level 2 chunk bucket blocks cross-origin reads,
 * and aviationweather needs an origin rewrite — and the GFS wind field has to
 * be decoded from GRIB2 server-side. In dev, Vite provides them (see
 * vite.config.ts). In production they were provided by nothing: a static host
 * answered every unknown path with index.html and a 200, so the app received
 * a page of HTML where it expected JSON or XML, failed to parse it, and
 * marked surface obs and Level 2 dead.
 *
 * Hence the ordering below, and the explicit 404 for unmatched proxy paths:
 * the SPA fallback must never be allowed to answer for /proxy/*, or that
 * failure mode comes straight back and looks like a data outage instead of a
 * routing bug.
 */
import express from 'express'
import { fileURLToPath } from 'node:url'
import { getWindPayload } from './gfsWind.mjs'
import { getGridPayload } from './gfsGrid.mjs'
import { getBuoysJson } from './ndbc.mjs'

const PORT = process.env.PORT ?? 8080
const DIST = fileURLToPath(new URL('../dist', import.meta.url))

const METAR = 'https://aviationweather.gov/api/data/metar'
const AWC = 'https://aviationweather.gov/api/data'
const NEXRAD = 'https://unidata-nexrad-level2-chunks.s3.amazonaws.com'

const app = express()
app.disable('x-powered-by')

/** Pass an upstream response through, preserving its status so errors surface. */
async function pipeUpstream(res, url, { cacheSeconds, contentType }) {
  const upstream = await fetch(url)
  const body = Buffer.from(await upstream.arrayBuffer())
  res.status(upstream.status)
  res.setHeader('Content-Type', contentType ?? upstream.headers.get('content-type') ?? 'text/plain')
  if (upstream.ok && cacheSeconds) {
    res.setHeader('Cache-Control', `public, max-age=${cacheSeconds}`)
  }
  res.end(body)
}

function fail(res, error) {
  res.status(502).type('text/plain').end(String(error))
}

/** Surface observations. The upstream rejects browser origins. */
app.use('/proxy/metar', async (req, res) => {
  try {
    await pipeUpstream(res, METAR + req.url, { cacheSeconds: 120 })
  } catch (e) {
    fail(res, e)
  }
})

/**
 * The rest of aviationweather.gov's data API (SIGMETs, PIREPs, TAFs…),
 * same origin problem as METAR. The product name rides in the path:
 * /proxy/awc/airsigmet?… → /api/data/airsigmet?…
 */
app.use('/proxy/awc', async (req, res) => {
  try {
    await pipeUpstream(res, AWC + req.url, { cacheSeconds: 120 })
  } catch (e) {
    fail(res, e)
  }
})

/**
 * NEXRAD Level 2 real-time chunks: bucket listings and chunk bodies. The
 * bucket sends no CORS headers, so the browser cannot read it directly.
 */
app.use('/proxy/nexrad', async (req, res) => {
  try {
    // Chunk objects never change once written; listings must stay fresh, or
    // the newest volume is invisible for as long as the listing is cached.
    const isListing = req.url.includes('list-type=')
    await pipeUpstream(res, NEXRAD + req.url, { cacheSeconds: isListing ? 0 : 3600 })
  } catch (e) {
    fail(res, e)
  }
})

/** GFS winds, decoded from GRIB2 here because the client cannot. */
app.use('/proxy/gfs-wind', async (req, res) => {
  try {
    const level = new URL(req.url, 'http://x').searchParams.get('level') ?? '10m'
    const payload = await getWindPayload(level)
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Cache-Control', 'public, max-age=600')
    res.end(payload)
  } catch (e) {
    fail(res, e)
  }
})

/** Scalar GFS fields (MSLP, heights, temp, CAPE) for the contour layer. */
app.use('/proxy/gfs-grid', async (req, res) => {
  try {
    const field = new URL(req.url, 'http://x').searchParams.get('field') ?? 'mslp'
    const payload = await getGridPayload(field)
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Cache-Control', 'public, max-age=600')
    res.end(payload)
  } catch (e) {
    fail(res, e)
  }
})

/** NDBC latest buoy obs, parsed from fixed-width text (upstream has no CORS). */
app.use('/proxy/ndbc', async (_req, res) => {
  try {
    const body = await getBuoysJson()
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.end(body)
  } catch (e) {
    fail(res, e)
  }
})

/** Anything else under /proxy is a bug here, not a page. Say so. */
app.use('/proxy', (_req, res) => {
  res.status(404).type('text/plain').end('no such proxy route')
})

/**
 * Hashed filenames can be cached forever. Three things must not be:
 * index.html, or a deploy keeps serving dead asset URLs; the service worker,
 * because a cached worker can never ship its own replacement and the app
 * would be frozen at this version indefinitely; and the manifest, which is
 * small and changes how the installed app identifies itself.
 */
const NEVER_CACHE = /(?:index\.html|sw\.js|manifest\.webmanifest)$/

app.use(
  express.static(DIST, {
    setHeaders: (res, path) => {
      res.setHeader(
        'Cache-Control',
        NEVER_CACHE.test(path) ? 'no-cache' : 'public, max-age=31536000, immutable',
      )
    },
  }),
)

app.get('/{*path}', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache')
  res.sendFile('index.html', { root: DIST })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`synoptic listening on ${PORT}`)
})
