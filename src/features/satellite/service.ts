import type { SourceRef } from '@/core/data/types'

export const GIBS: SourceRef = { id: 'gibs', label: 'NASA GIBS' }

const BASE = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best'

interface GibsProduct {
  id: string
  matrixSet: string
  ext: 'jpg' | 'png'
  maxZoom: number
  /**
   * Time step of the product. Daily products take a plain date; sub-daily
   * ones take a full ISO timestamp snapped to this cadence, or GIBS serves
   * nothing at all.
   */
  stepMs: number
  /**
   * How far the newest complete image trails the clock. Measured from the
   * WMTS capabilities' <Default> values (2026-08-15: 35–55 min for the GOES
   * layers), not guessed — asking for a frame that isn't published yet
   * renders blank tiles with a 200.
   */
  lagMs: number
}

const DAY_MS = 86_400_000
const TEN_MIN_MS = 600_000
/**
 * GOES lag margin. Capabilities said 35–55 min, and at a 60-min clamp the
 * newest frame was sometimes only partially published — black tile voids
 * across whole regions. 75 min trades a touch of freshness for whole frames.
 */
const GOES_LAG_MS = 75 * 60_000

/**
 * Layer ids, matrix sets and cadences verified against the live WMTS
 * capabilities on 2026-08-15. Notably: GIBS carries **no GOES water-vapor
 * band** — Air Mass is the closest thing, an RGB composite built from the
 * WV channels, and a better synoptic-pattern view than a single band anyway.
 */
export const PRODUCTS: Record<string, GibsProduct> = {
  truecolor: {
    id: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
    matrixSet: 'GoogleMapsCompatible_Level9',
    ext: 'jpg',
    maxZoom: 9,
    stepMs: DAY_MS,
    lagMs: DAY_MS,
  },
  ir: {
    id: 'VIIRS_SNPP_Brightness_Temp_BandI5_Day',
    matrixSet: 'GoogleMapsCompatible_Level8',
    ext: 'png',
    maxZoom: 8,
    stepMs: DAY_MS,
    lagMs: DAY_MS,
  },
  geocolor: {
    id: 'GOES-East_ABI_GeoColor',
    matrixSet: 'GoogleMapsCompatible_Level7',
    ext: 'png',
    maxZoom: 7,
    stepMs: TEN_MIN_MS,
    lagMs: GOES_LAG_MS,
  },
  'goes-ir': {
    id: 'GOES-East_ABI_Band13_Clean_Infrared',
    matrixSet: 'GoogleMapsCompatible_Level6',
    ext: 'png',
    maxZoom: 6,
    stepMs: TEN_MIN_MS,
    lagMs: GOES_LAG_MS,
  },
  'goes-vis': {
    id: 'GOES-East_ABI_Band2_Red_Visible_1km',
    matrixSet: 'GoogleMapsCompatible_Level7',
    ext: 'png',
    maxZoom: 7,
    stepMs: TEN_MIN_MS,
    lagMs: GOES_LAG_MS,
  },
  airmass: {
    id: 'GOES-East_ABI_Air_Mass',
    matrixSet: 'GoogleMapsCompatible_Level6',
    ext: 'png',
    maxZoom: 6,
    stepMs: TEN_MIN_MS,
    lagMs: GOES_LAG_MS,
  },
}

/**
 * The time path segment for a product at sim-time: quantized to the
 * product's own step so the URL only changes when a new frame can exist,
 * and clamped behind now by the product's lag so it always names a frame
 * that has been published.
 */
export function gibsTime(productKey: string, simTimeMs: number, nowMs: number): string {
  const p = PRODUCTS[productKey] ?? PRODUCTS.truecolor
  const t = Math.min(simTimeMs, nowMs - p.lagMs)
  const snapped = Math.floor(t / p.stepMs) * p.stepMs
  const iso = new Date(snapped).toISOString()
  return p.stepMs >= DAY_MS ? iso.slice(0, 10) : iso.replace(/\.\d{3}Z$/, 'Z')
}

/** XYZ template (note GIBS path order is z/y/x). */
export function gibsTileTemplate(productKey: string, time: string): string {
  const p = PRODUCTS[productKey] ?? PRODUCTS.truecolor
  return `${BASE}/${p.id}/default/${time}/${p.matrixSet}/{z}/{y}/{x}.${p.ext}`
}

/** The zoom ceiling for a product, so MapLibre overzooms rather than 404s. */
export function gibsMaxZoom(productKey: string): number {
  return (PRODUCTS[productKey] ?? PRODUCTS.truecolor).maxZoom
}
