import { fixtureActive } from '@/core/data/fixtures'
import type { SourceRef } from '@/core/data/types'

export const SPC: SourceRef = { id: 'spc', label: 'Storm Prediction Center' }

/**
 * The .lyr variant carries SPC's own stroke/fill hex per category alongside
 * LABEL/LABEL2, so the map renders the official colours without a mapping
 * table that would rot the day SPC changes their scheme.
 */
export function outlookUrl(day: string): string {
  return `https://www.spc.noaa.gov/products/outlook/day${day}otlk_cat.lyr.geojson`
}

/** IEM re-serves MCDs and watches as clean GeoJSON with open CORS. */
export const MCD_URL = 'https://mesonet.agron.iastate.edu/api/1/nws/spc_mcd.geojson'
export const WATCH_URL = 'https://mesonet.agron.iastate.edu/json/spcwatch.py'

export interface OutlookProps {
  DN: number
  LABEL: string
  LABEL2: string
  stroke: string
  fill: string
  EXPIRE_ISO: string
}

export interface McdProps {
  product_id: string
  num: number
  issue: string
  expire: string
  watch_confidence: number | null
  concerning: string
}

export interface WatchProps {
  type: 'TOR' | 'SVR'
  number: number
  is_pds: boolean
  max_hail_size: number | null
  max_wind_gust_knots: number | null
}

export type SpcFeature<P> = GeoJSON.Feature<GeoJSON.Geometry, P>
export type SpcCollection<P> = GeoJSON.FeatureCollection<GeoJSON.Geometry, P>

/** Tornado watches red, severe-thunderstorm yellow — the SPC convention. */
export function watchColor(type: WatchProps['type']): string {
  return type === 'TOR' ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-yellow-5)'
}

/** Features whose expiry is still ahead of now. */
export function unexpired<P extends { expire?: string; EXPIRE_ISO?: string }>(
  features: Array<SpcFeature<P>>,
  nowMs: number,
): Array<SpcFeature<P>> {
  return features.filter((f) => {
    const iso = f.properties.expire ?? f.properties.EXPIRE_ISO
    return iso === undefined || Date.parse(iso) > nowMs
  })
}

/**
 * Full text of one mesoscale discussion. Best-effort display content, not a
 * tracked data source — a failure here reads as a missing paragraph, not a
 * broken feed, so it stays outside the health strip.
 */
export async function fetchMcdText(productId: string): Promise<string> {
  if (fixtureActive()) return '(product text unavailable in demo mode)'
  const res = await fetch(`https://mesonet.agron.iastate.edu/api/1/nwstext/${productId}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}
