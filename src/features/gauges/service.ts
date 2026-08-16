import type { SourceRef } from '@/core/data/types'
import { MAP_COLORS as C } from '@/core/mapColors'

export const NWPS: SourceRef = { id: 'nwps', label: 'River gauges (NWPS)' }

/** srid is mandatory — without it the API silently returns zero gauges. */
export function gaugesUrl(latMin: number, lonMin: number, latMax: number, lonMax: number): string {
  const q = new URLSearchParams({
    'bbox.xmin': lonMin.toFixed(2),
    'bbox.ymin': latMin.toFixed(2),
    'bbox.xmax': lonMax.toFixed(2),
    'bbox.ymax': latMax.toFixed(2),
    srid: 'EPSG_4326',
  })
  return `https://api.water.noaa.gov/nwps/v1/gauges?${q}`
}

export interface GaugeStatus {
  primary: number // stage; -999 when missing
  primaryUnit: string
  secondary: number // flow; -999 when missing
  secondaryUnit: string
  floodCategory: string
  validTime: string
}

export interface Gauge {
  lid: string
  name: string
  latitude: number
  longitude: number
  status?: { observed?: GaugeStatus }
}

export interface GaugesResponse {
  gauges: Gauge[]
}

/** Ranked flood categories; anything else means "no current observation". */
const CATEGORY_RANK: Record<string, number> = {
  no_flooding: 0,
  action: 1,
  minor: 2,
  moderate: 3,
  major: 4,
}

/** AHPS map colours: green through action/minor/moderate/major. */
const CATEGORY_COLORS = [C.green7, C.yellow5, C.orange5, C.red6, C.grape6]

/** Gauges with a current observation, optionally only those at/above action. */
export function reportingGauges(gauges: Gauge[], floodingOnly: boolean): Gauge[] {
  return gauges.filter((g) => {
    const s = g.status?.observed
    if (!s || s.primary === -999) return false
    const rank = CATEGORY_RANK[s.floodCategory]
    if (rank === undefined) return false
    return floodingOnly ? rank >= 1 : true
  })
}

export function gaugeGeoJSON(gauges: Gauge[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: gauges.map((g) => {
      // reportingGauges guarantees observed status with a known category.
      const s = g.status?.observed
      const rank = CATEGORY_RANK[s?.floodCategory ?? ''] ?? 0
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [g.longitude, g.latitude] },
        properties: {
          lid: g.lid,
          rank,
          color: CATEGORY_COLORS[rank],
          stage: s ? `${s.primary.toFixed(1)} ${s.primaryUnit}` : '',
          // Click-card fields.
          name: g.name,
          flow: s && s.secondary !== -999 ? `${s.secondary} ${s.secondaryUnit}` : '',
          category: s?.floodCategory ?? '',
          validTime: s?.validTime ?? '',
        },
      }
    }),
  }
}
