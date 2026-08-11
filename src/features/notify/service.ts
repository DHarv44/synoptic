import type { AlertFeature } from '@/features/alerts/service'
import type { HomePoint } from '@/core/home/store'

/** Minimum severity a user is willing to be interrupted for. */
export const SEVERITY_LEVELS = ['Extreme', 'Severe', 'Moderate', 'Minor'] as const
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number]

const RANK: Record<string, number> = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3, Unknown: 4 }

export function meetsSeverity(severity: string, minimum: SeverityLevel): boolean {
  return (RANK[severity] ?? 4) <= RANK[minimum]
}

/**
 * Ray casting against one ring. Counts crossings of a ray heading east from
 * the point; an odd count means inside.
 */
function inRing(ring: number[][], lon: number, lat: number): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    // Does the edge straddle the point's latitude?
    if (yi > lat !== yj > lat) {
      const x = ((xj - xi) * (lat - yi)) / (yj - yi) + xi
      if (lon < x) inside = !inside
    }
  }
  return inside
}

/**
 * Point in a GeoJSON polygon. Ring 0 is the outer boundary and any further
 * rings are holes, so a point inside a hole is outside the polygon.
 */
export function pointInPolygon(coordinates: number[][][], lon: number, lat: number): boolean {
  if (coordinates.length === 0) return false
  if (!inRing(coordinates[0], lon, lat)) return false
  for (let i = 1; i < coordinates.length; i++) {
    if (inRing(coordinates[i], lon, lat)) return false
  }
  return true
}

/** Active alerts whose polygon covers the point, severest first. */
export function alertsAtPoint(alerts: AlertFeature[], point: HomePoint): AlertFeature[] {
  return alerts.filter(
    (a) => a.geometry !== null && pointInPolygon(a.geometry.coordinates, point.lon, point.lat),
  )
}

/** Notification body: what it is, where, and when it runs out. */
export function alertMessage(a: AlertFeature): string {
  const expires = Date.parse(a.properties.expires)
  const until = Number.isNaN(expires)
    ? ''
    : ` until ${new Date(expires).toISOString().slice(11, 16)}Z`
  return `${a.properties.areaDesc}${until}`
}
