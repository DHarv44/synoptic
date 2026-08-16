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
import { OUT_H, OUT_W, SRC_H, SRC_W, discoverRun, fetchField, pad2 } from './gfsWind.mjs'

const CACHE_TTL_MS = 30 * 60_000

/** field key → GRIB filter parameters. Analysis (f000) only, like wind. */
const FIELDS = {
  // MSLET (Eta membrane reduction), not PRMSL (Shuell): PRMSL carries 1-2 hPa
  // of reduction noise over high terrain that wallpapers the Rockies with
  // false closed contours and distorts ridge maxima by several hPa.
  mslp: { lev: 'lev_mean_sea_level', var: 'MSLET', unit: 'Pa' },
  hgt500: { lev: 'lev_500_mb', var: 'HGT', unit: 'gpm' },
  temp850: { lev: 'lev_850_mb', var: 'TMP', unit: 'K' },
  cape: { lev: 'lev_surface', var: 'CAPE', unit: 'J/kg' },
}

const cache = new Map() // field → { at, payload }

/** 0.25° → 0.5° decimation into floats; output row 0 = south. */
function decimate(field) {
  const { vals, northFirst } = field
  const out = new Float64Array(OUT_W * OUT_H)
  for (let j = 0; j < OUT_H; j++) {
    const srcRow = northFirst ? SRC_H - 1 - j * 2 : j * 2
    for (let i = 0; i < OUT_W; i++) {
      const v = vals[srcRow * SRC_W + i * 2]
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
export async function getGridPayload(fieldKey) {
  const spec = FIELDS[fieldKey]
  if (!spec) throw new Error(`unknown field: ${fieldKey}`)
  const hit = cache.get(fieldKey)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.payload

  const run = await discoverRun()
  const grid = decimate(await fetchField(run, spec.lev, spec.var))

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
      step: 0.5,
      scale,
      offset: min,
      field: fieldKey,
      unit: spec.unit,
      run: `${run.ymd} ${pad2(run.cycle)}z`,
    }),
  )
  if (header.length % 4 !== 0) {
    header = Buffer.concat([header, Buffer.alloc(4 - (header.length % 4), 0x20)])
  }
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32LE(header.length)
  const payload = Buffer.concat([lenBuf, header, Buffer.from(values.buffer)])
  cache.set(fieldKey, { at: Date.now(), payload })
  return payload
}
