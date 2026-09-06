/**
 * Scalar GFS fields for the client-side contour renderer — the general
 * sibling of gfsWind.mjs, sharing its run discovery and GRIB fetch.
 *
 * Winds ship as int8 because ±100 m/s around zero fits one. Scalars do not:
 * MSLP is ~87000–108000 Pa and 500 hPa heights ~4800–5900 gpm — large
 * offset, narrow range. Each payload is therefore quantized to uint16 with
 * its own scale/offset computed from the actual field, carried in the
 * header, so the client dequantizes without knowing anything per-variable.
 */
import { OUT_H, OUT_W, SRC_H, SRC_W, cacheSet, fetchField, fetchForValid } from './gfsWind.mjs'
import { runLabel } from './gfsValid.mjs'

const CACHE_TTL_MS = 30 * 60_000

/** field key → GRIB filter parameters; the run/hour come from the valid time. */
const FIELDS = {
  // Two sea-level reductions, user-selectable: MSLET (Eta membrane) is the
  // terrain-sane default; PRMSL (Shuell) is the classic reduction, noisy
  // over the Rockies but kept as an option — datasets get added here, not
  // replaced.
  mslp: { lev: 'lev_mean_sea_level', var: 'MSLET', unit: 'Pa' },
  mslp_prmsl: { lev: 'lev_mean_sea_level', var: 'PRMSL', unit: 'Pa' },
  hgt500: { lev: 'lev_500_mb', var: 'HGT', unit: 'gpm' },
  temp850: { lev: 'lev_850_mb', var: 'TMP', unit: 'K' },
  cape: { lev: 'lev_surface', var: 'CAPE', unit: 'J/kg' },
}

const cache = new Map() // `${field}@${hourMs}` → { at, payload }

/** Row flip (and any decimation) into floats; output row 0 = south. */
function decimate(field) {
  const { vals, northFirst } = field
  const factor = SRC_W / OUT_W
  const out = new Float64Array(OUT_W * OUT_H)
  for (let j = 0; j < OUT_H; j++) {
    const srcRow = northFirst ? SRC_H - 1 - j * factor : j * factor
    for (let i = 0; i < OUT_W; i++) {
      const v = vals[srcRow * SRC_W + i * factor]
      out[j * OUT_W + i] = Number.isFinite(v) ? v : NaN
    }
  }
  return out
}

/**
 * Binary payload: [u32le headerLen][header JSON, space-padded to a multiple
 * of 4][uint16le values]. The padding keeps the value block 2-byte aligned
 * so the client can view it as a Uint16Array without copying.
 */
export async function getGridPayload(fieldKey, validMs = Date.now()) {
  const spec = FIELDS[fieldKey]
  if (!spec) throw new Error(`unknown field: ${fieldKey}`)
  const hourMs = Math.floor(validMs / 3600_000) * 3600_000
  const key = `${fieldKey}@${hourMs}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.payload

  const { run, fhour, result } = await fetchForValid(hourMs, (r, h) =>
    fetchField(r, spec.lev, spec.var, h),
  )
  const grid = decimate(result)

  let min = Infinity
  let max = -Infinity
  for (const v of grid) {
    if (Number.isNaN(v)) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  if (min > max) throw new Error(`field ${fieldKey} decoded to no finite values`)
  const scale = max > min ? (max - min) / 65535 : 1

  const values = new Uint16Array(grid.length)
  for (let i = 0; i < grid.length; i++) {
    // NaN cells (none expected from GFS global grids) pin to the minimum.
    const v = Number.isNaN(grid[i]) ? min : grid[i]
    values[i] = Math.round((v - min) / scale)
  }

  let header = Buffer.from(
    JSON.stringify({
      width: OUT_W,
      height: OUT_H,
      lonMin: 0,
      latMin: -90,
      step: (360 / OUT_W),
      scale,
      offset: min,
      field: fieldKey,
      unit: spec.unit,
      run: runLabel(run),
      fhour,
      valid: new Date(hourMs).toISOString(),
    }),
  )
  if (header.length % 4 !== 0) {
    header = Buffer.concat([header, Buffer.alloc(4 - (header.length % 4), 0x20)])
  }
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32LE(header.length)
  const payload = Buffer.concat([lenBuf, header, Buffer.from(values.buffer)])
  cacheSet(cache, key, { at: Date.now(), payload })
  return payload
}
