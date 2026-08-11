import type { SourceRef } from '@/core/data/types'

export const IEM: SourceRef = { id: 'iem-nexrad', label: 'IEM NEXRAD mosaic' }

const BASE = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0'

/** CONUS-ish bounds (generous) for showing the high-res mosaic. */
export const CONUS = { latMin: 20, latMax: 55, lonMin: -130, lonMax: -60 }

export function overConus(lat: number, lon: number): boolean {
  return lat >= CONUS.latMin && lat <= CONUS.latMax && lon >= CONUS.lonMin && lon <= CONUS.lonMax
}

/**
 * Where the mosaic reliably has data, as opposed to `CONUS` above, which is
 * deliberately generous so tile requests aren't clipped at the edges. Hiding
 * the global composite is only safe inside this tighter box: the generous
 * one reaches Cuba and central Canada, where the mosaic renders nothing and
 * suppressing the global layer left the map bare.
 */
const MOSAIC_CORE = { latMin: 26, latMax: 48, lonMin: -123, lonMax: -70 }

/**
 * Whole viewport inside the mosaic's real coverage — the test for whether
 * the global composite can be hidden without leaving a blank edge.
 */
export function boundsInsideConus(b: [number, number, number, number] | null): boolean {
  if (!b) return false
  const [w, s, e, n] = b
  return (
    w >= MOSAIC_CORE.lonMin &&
    e <= MOSAIC_CORE.lonMax &&
    s >= MOSAIC_CORE.latMin &&
    n <= MOSAIC_CORE.latMax
  )
}

/**
 * IEM NEXRAD base-reflectivity (n0q) tile product for a sim-time:
 * current product within ~2.5 min of now, else 5-min archive steps back
 * to 50 min, else null (RainViewer's 2h history covers the rest).
 */
export function iemProduct(simTimeMs: number, nowMs: number): string | null {
  const dtMin = (nowMs - simTimeMs) / 60_000
  if (dtMin < 2.5) return 'nexrad-n0q-900913'
  const step = Math.round(dtMin / 5) * 5
  if (step > 50) return null
  return `nexrad-n0q-900913-m${String(step).padStart(2, '0')}m`
}

export function iemTileTemplate(product: string): string {
  return `${BASE}/${product}/{z}/{x}/{y}.png`
}
