import type { SourceRef } from '@/core/data/types'

export const METAR_SOURCE: SourceRef = { id: 'metar', label: 'METAR (aviationweather.gov)' }

export interface Metar {
  icaoId: string
  lat: number
  lon: number
  temp: number | null // °C
  dewp: number | null // °C
  wdir: number | string | null // deg or 'VRB'
  wspd: number | null // kt
}

export function metarUrl(latMin: number, lonMin: number, latMax: number, lonMax: number): string {
  const bbox = [latMin, lonMin, latMax, lonMax].map((v) => v.toFixed(1)).join(',')
  // Served via the proxy (aviationweather.gov blocks browser CORS).
  return `/proxy/metar?format=json&bbox=${bbox}`
}

/** Grid-thin stations to a displayable count, preferring one per cell. */
export function thinStations(stations: Metar[], cellDeg: number, cap = 80): Metar[] {
  const seen = new Set<string>()
  const out: Metar[] = []
  for (const s of stations) {
    if (typeof s.lat !== 'number' || typeof s.lon !== 'number') continue
    const cell = `${Math.round(s.lat / cellDeg)},${Math.round(s.lon / cellDeg)}`
    if (seen.has(cell)) continue
    seen.add(cell)
    out.push(s)
    if (out.length >= cap) break
  }
  return out
}
