import type { SourceRef } from '@/core/data/types'

export const IEM: SourceRef = { id: 'iem-nexrad', label: 'IEM NEXRAD mosaic' }

const BASE = 'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0'

/** CONUS-ish bounds (generous) for showing the high-res mosaic. */
export const CONUS = { latMin: 20, latMax: 55, lonMin: -130, lonMax: -60 }

export function overConus(lat: number, lon: number): boolean {
  return lat >= CONUS.latMin && lat <= CONUS.latMax && lon >= CONUS.lonMin && lon <= CONUS.lonMax
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
