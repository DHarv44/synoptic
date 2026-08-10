import type { SourceRef } from '@/core/data/types'

export const GIBS: SourceRef = { id: 'gibs', label: 'NASA GIBS' }

const BASE = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best'

interface GibsProduct {
  id: string
  matrixSet: string
  ext: 'jpg' | 'png'
  maxZoom: number
  /** Daily products lag; latest complete day is yesterday UTC. */
  daily: boolean
}

export const PRODUCTS: Record<string, GibsProduct> = {
  truecolor: {
    id: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
    matrixSet: 'GoogleMapsCompatible_Level9',
    ext: 'jpg',
    maxZoom: 9,
    daily: true,
  },
  ir: {
    id: 'VIIRS_SNPP_Brightness_Temp_BandI5_Day',
    matrixSet: 'GoogleMapsCompatible_Level8',
    ext: 'png',
    maxZoom: 8,
    daily: true,
  },
}

/** UTC date string for a daily product at sim-time (clamped to yesterday). */
export function gibsDate(simTimeMs: number, nowMs: number): string {
  const yesterday = nowMs - 86_400_000
  const t = Math.min(simTimeMs, yesterday)
  return new Date(t).toISOString().slice(0, 10)
}

/** XYZ template (note GIBS path order is z/y/x). */
export function gibsTileTemplate(productKey: string, date: string): string {
  const p = PRODUCTS[productKey] ?? PRODUCTS.truecolor
  return `${BASE}/${p.id}/default/${date}/${p.matrixSet}/{z}/{y}/{x}.${p.ext}`
}
