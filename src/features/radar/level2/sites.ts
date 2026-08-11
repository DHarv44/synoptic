import sitesJson from '@/features/radar/level2/sites.json'

export interface RadarSite {
  id: string
  name: string
  lat: number
  lon: number
}

/** WSR-88D network (bundled from api.weather.gov/radar/stations; static). */
export const SITES: RadarSite[] = (sitesJson as { features: RadarSite[] }).features

const DEG = Math.PI / 180

function distKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = (bLat - aLat) * DEG
  const dLon = (bLon - aLon) * DEG * Math.cos(((aLat + bLat) / 2) * DEG)
  return 6371 * Math.hypot(dLat, dLon)
}

/** Nearest site to a point, or null if beyond maxKm. */
export function nearestSite(lat: number, lon: number, maxKm = 400): RadarSite | null {
  let best: RadarSite | null = null
  let bestD = maxKm
  for (const s of SITES) {
    const d = distKm(lat, lon, s.lat, s.lon)
    if (d < bestD) {
      bestD = d
      best = s
    }
  }
  return best
}
