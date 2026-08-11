/** Site-relative polar geometry helpers (flat-earth local approximation). */

const DEG = Math.PI / 180
const EARTH_R = 6_371_000

export interface LatLon {
  lat: number
  lon: number
}

export interface AzRange {
  azDeg: number
  rangeM: number
}

/** lat/lon → azimuth (deg from north) and slant-free ground range (m). */
export function toAzRange(site: LatLon, p: LatLon): AzRange {
  const dLat = (p.lat - site.lat) * DEG * EARTH_R
  const dLon = (p.lon - site.lon) * DEG * EARTH_R * Math.cos(site.lat * DEG)
  return {
    azDeg: (Math.atan2(dLon, dLat) / DEG + 360) % 360,
    rangeM: Math.hypot(dLat, dLon),
  }
}

/** Evenly spaced points along the A→B line, inclusive. */
export function sampleLine(a: LatLon, b: LatLon, count: number): LatLon[] {
  const out: LatLon[] = []
  for (let i = 0; i < count; i++) {
    const f = i / (count - 1)
    out.push({ lat: a.lat + (b.lat - a.lat) * f, lon: a.lon + (b.lon - a.lon) * f })
  }
  return out
}

export function distanceKm(a: LatLon, b: LatLon): number {
  const dLat = (b.lat - a.lat) * DEG * EARTH_R
  const dLon = (b.lon - a.lon) * DEG * EARTH_R * Math.cos(((a.lat + b.lat) / 2) * DEG)
  return Math.hypot(dLat, dLon) / 1000
}
