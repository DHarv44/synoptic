/**
 * "When do tropical-storm-force winds reach here?" from NHC's arrival-time
 * isochrones — polylines labelled "Mon 8 am", six hours apart (~70 km near
 * the storm, ~190 km far out, measured on Marie 2026-09-06). The nearest
 * labelled line within MAX_KM answers to about ±6 h; beyond that the point
 * is outside the area NHC drew, and the honest answer is none.
 */

export const MAX_KM = 120

const KM_PER_DEG = 111.32

function segmentDistanceKm(p: [number, number], a: number[], b: number[]): number {
  // Equirectangular in km around the point's latitude — fine at this scale.
  const cosLat = Math.cos((p[1] * Math.PI) / 180)
  const ax = (a[0] - p[0]) * KM_PER_DEG * cosLat
  const ay = (a[1] - p[1]) * KM_PER_DEG
  const bx = (b[0] - p[0]) * KM_PER_DEG * cosLat
  const by = (b[1] - p[1]) * KM_PER_DEG
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2))
  return Math.hypot(ax + t * dx, ay + t * dy)
}

/** Shortest distance from a point to a (Multi)LineString, in km. */
export function distanceToLineKm(geometry: GeoJSON.Geometry, lat: number, lon: number): number {
  const lines =
    geometry.type === 'LineString'
      ? [geometry.coordinates]
      : geometry.type === 'MultiLineString'
        ? geometry.coordinates
        : []
  let best = Infinity
  for (const line of lines) {
    for (let i = 1; i < line.length; i++) {
      best = Math.min(best, segmentDistanceKm([lon, lat], line[i - 1], line[i]))
    }
  }
  return best
}

export interface ArrivalEstimate {
  /** Label of the nearest most-likely line, e.g. "Mon 8 am". */
  likely: string
  /** Nearest earliest-reasonable line, when NHC drew one. */
  earliest: string | null
  distKm: number
}

/**
 * Nearest labelled isochrone to a point. `labelOf` reads the label from a
 * feature (the map service calls it `arrival_time`). Null when no likely
 * line lies within MAX_KM.
 */
export function arrivalAtPoint(
  likelyLines: GeoJSON.Feature[],
  earliestLines: GeoJSON.Feature[],
  lat: number,
  lon: number,
  labelOf: (f: GeoJSON.Feature) => string,
): ArrivalEstimate | null {
  const nearest = (lines: GeoJSON.Feature[]): { label: string; distKm: number } | null => {
    let best: { label: string; distKm: number } | null = null
    for (const f of lines) {
      const label = labelOf(f).trim()
      if (!label) continue
      const d = distanceToLineKm(f.geometry, lat, lon)
      if (best === null || d < best.distKm) best = { label, distKm: d }
    }
    return best
  }
  const likely = nearest(likelyLines)
  if (!likely || likely.distKm > MAX_KM) return null
  const earliest = nearest(earliestLines)
  return {
    likely: likely.label,
    earliest: earliest && earliest.distKm <= MAX_KM ? earliest.label : null,
    distKm: likely.distKm,
  }
}
