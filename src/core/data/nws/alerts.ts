import type { SourceRef } from '@/core/data/types'
import { geometryBbox, type Bbox } from '@/map/viewStore'

export const NWS: SourceRef = { id: 'nws-alerts', label: 'NWS Alerts' }

export const ALERTS_URL = 'https://api.weather.gov/alerts/active?status=actual'

export interface AlertFeature {
  id: string
  /**
   * Storm-based alerts carry a Polygon from the feed. Zone-based ones carry
   * null until their zones are resolved on demand, after which this holds
   * the zones' polygons as a collection and `zoneResolved` is set.
   */
  geometry: GeoJSON.Geometry | null
  zoneResolved?: boolean
  properties: {
    event: string
    severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown'
    headline?: string
    areaDesc: string
    expires: string
    description?: string
    /** Zone URLs (api.weather.gov/zones/…) the alert applies to. */
    affectedZones?: string[]
  }
}

export interface AlertsResponse {
  features: AlertFeature[]
}

const SEVERITY_RANK: Record<string, number> = {
  Extreme: 0,
  Severe: 1,
  Moderate: 2,
  Minor: 3,
  Unknown: 4,
}

export function sortBySeverity(features: AlertFeature[]): AlertFeature[] {
  return [...features].sort(
    (a, b) =>
      (SEVERITY_RANK[a.properties.severity] ?? 4) - (SEVERITY_RANK[b.properties.severity] ?? 4),
  )
}

/** Event → display color (CSS var); hue reserved for meaning. */
export function alertColor(event: string): string {
  if (event.includes('Tornado')) return '#fa5252'
  if (event.includes('Severe Thunderstorm')) return '#fab005'
  if (event.includes('Flash Flood') || event.includes('Flood')) return '#40c057'
  if (event.includes('Winter') || event.includes('Ice') || event.includes('Snow')) return '#748ffc'
  if (event.includes('Heat')) return '#ff922b'
  if (event.includes('Hurricane') || event.includes('Tropical')) return '#e64980'
  return '#868e96'
}

/**
 * Outline weight multiplier. Not everything with a polygon deserves equal
 * ink: a tornado warning has to read instantly against a loud reflectivity
 * field, while a frost advisory should stay quiet.
 */
export function alertWeight(event: string): number {
  if (event.includes('Tornado')) return 1.6
  if (event.includes('Severe Thunderstorm') || event.includes('Flash Flood')) return 1.25
  return 1
}

/**
 * Broad families of NWS product, for filtering. The list is long and
 * lopsided — a quiet day is mostly small craft advisories and beach hazard
 * statements — so the point is to let people mute what they don't work on.
 */
export type AlertCategory =
  | 'convective'
  | 'tropical'
  | 'marine'
  | 'flood'
  | 'winter'
  | 'heat'
  | 'other'

/** Settings key that hides a category, or null for ones we never hide. */
export const CATEGORY_SETTING: Record<AlertCategory, string | null> = {
  convective: null,
  tropical: 'showTropical',
  marine: 'showMarine',
  flood: 'showFlood',
  winter: 'showWinter',
  heat: 'showHeat',
  other: 'showOther',
}

/**
 * Order matters. Coastal Flood is a coastal product, not a river flood, and
 * a Tropical Storm Warning is not a marine bulletin — the earlier tests win.
 * Tornado and thunderstorm warnings are deliberately uncategorised for
 * hiding: burying those behind a preference is not a feature.
 */
export function alertCategory(event: string): AlertCategory {
  if (/Tornado|Severe Thunderstorm|Dust Storm|Extreme Wind/.test(event)) return 'convective'
  if (/Hurricane(?! Force)|Tropical|Typhoon|Storm Surge/.test(event)) return 'tropical'
  if (/Marine|Small Craft|Gale|Hurricane Force|Beach Hazards|Rip Current|Coastal|Lakeshore|Sea|Ashfall/.test(event)) {
    return 'marine'
  }
  if (/Flood|Hydrologic|Dam |Seiche/.test(event)) return 'flood'
  if (/Winter|Snow|Ice |Icy|Blizzard|Freez|Frost|Wind Chill|Sleet|Avalanche|Cold/.test(event)) {
    return 'winter'
  }
  if (/Heat/.test(event)) return 'heat'
  return 'other'
}

/** Alerts that can be drawn: storm polygons, plus zone alerts once resolved. */
export function withGeometry(features: AlertFeature[]): AlertFeature[] {
  return features.filter((f) => f.geometry !== null)
}

/** Bounding box of an alert's geometry, or null while it is unmapped. */
export function alertBbox(a: AlertFeature): Bbox | null {
  return geometryBbox(a.geometry)
}
