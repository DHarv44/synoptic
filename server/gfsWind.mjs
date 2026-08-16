/**
 * GFS wind fields via the NOMADS GRIB filter CGI (OPeNDAP was retired,
 * SCN 25-81), decoded with grib2class (pure JS). Shared by the Vite dev
 * middleware and the production Express proxy.
 */
import GRIB2CLASS from 'grib2class'

const FILTER = 'https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl'
const CACHE_TTL_MS = 30 * 60_000

// 0.25° grid
export const SRC_W = 1440
export const SRC_H = 721
// served at 0.5°
export const OUT_W = 720
export const OUT_H = 361
const SCALE = 100 / 127 // int8 → m/s

/** level key → filter CGI level parameter */
const LEVELS = {
  '10m': 'lev_10_m_above_ground',
  '850': 'lev_850_mb',
  '700': 'lev_700_mb',
  '500': 'lev_500_mb',
  '250': 'lev_250_mb',
}

const cache = new Map() // level → { at, payload }
let runCache = null // { ymd, cycle, at }

export function pad2(n) {
  return String(n).padStart(2, '0')
}

function filterUrl(ymd, cycle, levParam, varName) {
  const p = new URLSearchParams({
    file: `gfs.t${pad2(cycle)}z.pgrb2.0p25.f000`,
    [levParam]: 'on',
    [`var_${varName}`]: 'on',
    dir: `/gfs.${ymd}/${pad2(cycle)}/atmos`,
  })
  return `${FILTER}?${p}`
}

/** Latest cycle whose f000 exists: probe recent cycles with a tiny field. */
export async function discoverRun() {
  if (runCache && Date.now() - runCache.at < CACHE_TTL_MS) return runCache
  const now = new Date()
  for (let back = 0; back < 6; back++) {
    const t = new Date(now.getTime() - (4 + back * 6) * 3600_000)
    const cycle = Math.floor(t.getUTCHours() / 6) * 6
    const ymd = `${t.getUTCFullYear()}${pad2(t.getUTCMonth() + 1)}${pad2(t.getUTCDate())}`
    try {
      const res = await fetch(filterUrl(ymd, cycle, 'lev_10_m_above_ground', 'UGRD'), {
        method: 'HEAD',
      })
      if (res.ok) {
        runCache = { ymd, cycle, at: Date.now() }
        return runCache
      }
    } catch {
      // try older cycle
    }
  }
  throw new Error('no GFS cycle reachable on NOMADS filter')
}

/**
 * The IEEE-754 reference value from GRIB2 Section 5 (octets 12–15),
 * read straight from the message bytes. grib2class misparses NEGATIVE
 * reference values (UGRD's came back 5.6e-74 instead of about -4000),
 * which shifted every wind by +30-plus m/s while leaving all-positive
 * fields like pressure untouched — the wind layer's original sin.
 */
export function grib2RefValue(buf) {
  let off = 16 // past Section 0 (GRIB, reserved, discipline, edition, length)
  while (off + 5 <= buf.length) {
    if (buf.slice(off, off + 4).toString() === '7777') break
    const len = buf.readUInt32BE(off)
    const num = buf.readUInt8(off + 4)
    if (num === 5) return buf.readFloatBE(off + 11)
    if (len === 0) break
    off += len
  }
  throw new Error('no Section 5 in GRIB message')
}

/** Decode one single-message GRIB2 subset. Returns row-major floats (north first). */
function decodeGrib(buf) {
  const grib = new GRIB2CLASS({ numMembers: 1, log: false })
  grib.parse(buf)
  const vals = grib.DataValues?.[0]
  if (!vals || vals.length < SRC_W * SRC_H) {
    throw new Error(`grib decode failed (${vals?.length ?? 0} values)`)
  }
  // Correct the library's reference-value parse: values are
  // (R + X·2^E)/10^D, so a mis-read R shifts every value by ΔR/10^D.
  const trueRef = grib2RefValue(buf)
  const delta = (trueRef - grib.ReferenceValue) / Math.pow(10, grib.DecimalScaleFactor)
  if (Math.abs(delta) > 1e-9) {
    for (let i = 0; i < vals.length; i++) vals[i] += delta
  }
  return { vals, northFirst: grib.La1 > 0 }
}

export async function fetchField(run, levParam, varName) {
  const res = await fetch(filterUrl(run.ymd, run.cycle, levParam, varName))
  if (!res.ok) throw new Error(`NOMADS filter ${res.status} for ${varName}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.slice(0, 4).toString() !== 'GRIB') throw new Error('non-GRIB response')
  return decodeGrib(buf)
}

/** 0.25° → 0.5° decimation + int8 quantization; output row 0 = south. */
function quantize(field) {
  const { vals, northFirst } = field
  const out = new Int8Array(OUT_W * OUT_H)
  for (let j = 0; j < OUT_H; j++) {
    const srcRow = northFirst ? SRC_H - 1 - j * 2 : j * 2
    for (let i = 0; i < OUT_W; i++) {
      let v = vals[srcRow * SRC_W + i * 2]
      if (!Number.isFinite(v)) v = 0
      out[j * OUT_W + i] = Math.max(-127, Math.min(127, Math.round(v / SCALE)))
    }
  }
  return out
}

/**
 * Binary payload: [u32le headerLen][header JSON][u int8s][v int8s].
 * Grid: lat -90..90 (row 0 = south), lon 0..359.5, both 0.5° steps.
 */
export async function getWindPayload(level) {
  const levParam = LEVELS[level]
  if (!levParam) throw new Error(`unknown level: ${level}`)
  const hit = cache.get(level)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.payload

  const run = await discoverRun()
  const [u, v] = await Promise.all([
    fetchField(run, levParam, 'UGRD'),
    fetchField(run, levParam, 'VGRD'),
  ])
  const header = Buffer.from(
    JSON.stringify({
      width: OUT_W,
      height: OUT_H,
      lonMin: 0,
      latMin: -90,
      step: 0.5,
      scale: SCALE,
      level,
      run: `${run.ymd} ${pad2(run.cycle)}z`,
    }),
  )
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32LE(header.length)
  const payload = Buffer.concat([
    lenBuf,
    header,
    Buffer.from(quantize(u).buffer),
    Buffer.from(quantize(v).buffer),
  ])
  cache.set(level, { at: Date.now(), payload })
  return payload
}
