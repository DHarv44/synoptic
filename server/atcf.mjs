/**
 * NHC ATCF decks and text products, parsed server-side. Shared by the Vite
 * middleware and the Express proxy.
 *
 * The a-deck (model guidance) for one storm is ~7.6 MB of text across every
 * run and 34 techs — probed 2026-09-06 on Marie — so it is filtered here to
 * the latest run and a curated model set before anything crosses the wire.
 * The b-deck (best track) is small and served whole. Discussions are the
 * <pre> of NHC's HTML page.
 */
import { gunzipSync } from 'node:zlib'

const ATCF = 'https://ftp.nhc.noaa.gov/atcf'
const NHC_TEXT = 'https://www.nhc.noaa.gov/text'
const CACHE_TTL_MS = 30 * 60_000
const TEXT_TTL_MS = 10 * 60_000

/** Techs worth drawing, with the names people know them by. */
export const MODEL_TECHS = {
  OFCL: 'NHC official',
  AVNI: 'GFS',
  HWFI: 'HWRF',
  HMNI: 'HMON',
  HFAI: 'HAFS-A',
  HFBI: 'HAFS-B',
  CTCI: 'COAMPS-TC',
  UKXI: 'UKMET',
  CMCI: 'CMC',
  NVGI: 'NAVGEM',
  AEMI: 'GEFS mean',
  TVCN: 'Consensus',
  EMXI: 'ECMWF',
}

/** "229N" → 22.9, "1217W" → −121.7. */
export function atcfCoord(tok) {
  const m = /^(\d+)([NSEW])$/.exec(tok.trim())
  if (!m) return null
  const v = Number(m[1]) / 10
  return m[2] === 'S' || m[2] === 'W' ? -v : v
}

/** One ATCF line → its leading fields; null for anything unparsable. */
export function parseAtcfLine(line) {
  const f = line.split(',').map((s) => s.trim())
  if (f.length < 9) return null
  const lat = atcfCoord(f[6])
  const lon = atcfCoord(f[7])
  if (lat === null || lon === null) return null
  const mslp = Number(f[9])
  return {
    basin: f[0],
    num: Number(f[1]),
    dtg: f[2],
    tech: f[4],
    tau: Number(f[5]) || 0,
    lat,
    lon,
    vmax: Number(f[8]) || 0,
    mslp: Number.isFinite(mslp) && mslp > 0 ? mslp : null,
    ty: f[10] ?? '',
  }
}

function dtgMs(dtg) {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})$/.exec(dtg)
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4])) : null
}

/** Best track: one point per synoptic time (radii rows collapse), oldest first. */
export function parseBDeck(text) {
  const byDtg = new Map()
  for (const line of text.split('\n')) {
    const r = parseAtcfLine(line)
    if (!r || r.tech !== 'BEST') continue
    const t = dtgMs(r.dtg)
    if (t === null || byDtg.has(t)) continue
    byDtg.set(t, { t, lat: r.lat, lon: r.lon, vmax: r.vmax, mslp: r.mslp, ty: r.ty })
  }
  return [...byDtg.values()].sort((a, b) => a.t - b.t)
}

/**
 * Model guidance for the LATEST run only, curated techs only, one point per
 * forecast hour per model. Returns { dtg, runMs, models: [{ tech, label, points }] }.
 */
export function parseADeck(text, techs = MODEL_TECHS) {
  const rows = []
  let latest = ''
  for (const line of text.split('\n')) {
    const r = parseAtcfLine(line)
    if (!r || !(r.tech in techs)) continue
    rows.push(r)
    if (r.dtg > latest) latest = r.dtg
  }
  const models = new Map()
  for (const r of rows) {
    if (r.dtg !== latest) continue
    const m = models.get(r.tech) ?? { tech: r.tech, label: techs[r.tech], points: new Map() }
    if (!m.points.has(r.tau)) m.points.set(r.tau, { tau: r.tau, lat: r.lat, lon: r.lon, vmax: r.vmax })
    models.set(r.tech, m)
  }
  return {
    dtg: latest,
    runMs: dtgMs(latest),
    models: [...models.values()]
      .map((m) => ({ ...m, points: [...m.points.values()].sort((a, b) => a.tau - b.tau) }))
      .filter((m) => m.points.length >= 2),
  }
}

const cache = new Map()

async function cached(key, ttl, load) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < ttl) return hit.value
  const value = await load()
  cache.set(key, { at: Date.now(), value })
  return value
}

const STORM_ID = /^[a-z]{2}\d{6}$/

export async function getBDeck(stormId) {
  if (!STORM_ID.test(stormId)) throw new Error(`bad storm id: ${stormId}`)
  return cached(`b:${stormId}`, CACHE_TTL_MS, async () => {
    const res = await fetch(`${ATCF}/btk/b${stormId}.dat`)
    if (!res.ok) throw new Error(`b-deck HTTP ${res.status}`)
    return parseBDeck(await res.text())
  })
}

export async function getADeck(stormId) {
  if (!STORM_ID.test(stormId)) throw new Error(`bad storm id: ${stormId}`)
  return cached(`a:${stormId}`, CACHE_TTL_MS, async () => {
    const res = await fetch(`${ATCF}/aid_public/a${stormId}.dat.gz`)
    if (!res.ok) throw new Error(`a-deck HTTP ${res.status}`)
    const text = gunzipSync(Buffer.from(await res.arrayBuffer())).toString('latin1')
    return parseADeck(text)
  })
}

const PRODUCT = /^[A-Z0-9]{6,12}$/

/** The text inside NHC's <pre>, entities decoded. */
export function extractPre(html) {
  const m = /<pre[^>]*>([\s\S]*?)<\/pre>/i.exec(html)
  if (!m) return null
  return m[1]
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

export async function getDiscussion(product) {
  if (!PRODUCT.test(product)) throw new Error(`bad product: ${product}`)
  return cached(`t:${product}`, TEXT_TTL_MS, async () => {
    const res = await fetch(`${NHC_TEXT}/${product}.shtml`)
    if (!res.ok) throw new Error(`NHC text HTTP ${res.status}`)
    const text = extractPre(await res.text())
    if (text === null) throw new Error('no <pre> in NHC text page')
    return { product, text }
  })
}
