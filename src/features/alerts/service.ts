import type { SourceRef } from '@/core/data/types'

export const NWS: SourceRef = { id: 'nws-alerts', label: 'NWS Alerts' }

export const ALERTS_URL = 'https://api.weather.gov/alerts/active?status=actual'

export interface AlertFeature {
  id: string
  geometry: { type: 'Polygon'; coordinates: number[][][] } | null
  properties: {
    event: string
    severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown'
    headline?: string
    areaDesc: string
    expires: string
    description?: string
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

/** Polygon-bearing alerts only (zone-referenced alerts render in the panel list). */
export function withGeometry(features: AlertFeature[]): AlertFeature[] {
  return features.filter((f) => f.geometry?.type === 'Polygon')
}
