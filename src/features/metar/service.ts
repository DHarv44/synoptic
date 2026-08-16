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

/**
 * Grid-thin stations to a displayable count: one per cell, then an even
 * stride across cells sorted by position. Truncating at the cap instead
 * starved whole regions — AWC's data order is not spatially uniform, so
 * "first N stations" meant "the northern half".
 */
export function thinStations(stations: Metar[], cellDeg: number, cap = 80): Metar[] {
  const byCell = new Map<string, Metar>()
  for (const s of stations) {
    if (typeof s.lat !== 'number' || typeof s.lon !== 'number') continue
    const cell = `${Math.round(s.lat / cellDeg)},${Math.round(s.lon / cellDeg)}`
    if (!byCell.has(cell)) byCell.set(cell, s)
  }
  const reps = [...byCell.values()].sort((a, b) => a.lat - b.lat || a.lon - b.lon)
  if (reps.length <= cap) return reps
  const out: Metar[] = []
  const stride = reps.length / cap
  for (let i = 0; i < cap; i++) out.push(reps[Math.floor(i * stride)])
  return out
}
