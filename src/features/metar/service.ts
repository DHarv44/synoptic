import type { SourceRef } from '@/core/data/types'

export const METAR_SOURCE: SourceRef = { id: 'metar', label: 'METAR (aviationweather.gov)' }
export const IEM_OBS_SOURCE: SourceRef = { id: 'iem-obs', label: 'IEM currents (road weather, SYNOP)' }

/** Where a station plot came from; airports are the default and win a thinning cell. */
export type ObsKind = 'metar' | 'road' | 'synop'
export type ObsTier = Exclude<ObsKind, 'metar'>

export const OBS_KIND_LABEL: Record<ObsTier, string> = { road: 'Road weather', synop: 'SYNOP' }

export interface Metar {
  icaoId: string
  lat: number
  lon: number
  temp: number | null // °C
  dewp: number | null // °C
  wdir: number | string | null // deg or 'VRB'
  wspd: number | null // kt
  /** AWC-computed flight category: VFR | MVFR | IFR | LIFR. */
  fltCat: string | null
  name: string
  rawOb: string
  obsTime: number // unix seconds
  /** Absent on AWC METARs; the proxy stamps the IEM tiers. */
  kind?: ObsKind
  network?: string
  gust?: number | null // kt
  mslp?: number | null // hPa
  wx?: string | null
  sky?: string | null
}

export type Bbox = [latMin: number, lonMin: number, latMax: number, lonMax: number]

const bboxParam = (b: Bbox): string => b.map((v) => v.toFixed(1)).join(',')

export function metarUrl(latMin: number, lonMin: number, latMax: number, lonMax: number): string {
  // Served via the proxy (aviationweather.gov blocks browser CORS).
  return `/proxy/metar?format=json&bbox=${bboxParam([latMin, lonMin, latMax, lonMax])}`
}

/** The IEM tiers for the same box; the server holds the national sets warm. */
export function iemObsUrl(bbox: Bbox, tiers: ObsTier[]): string {
  return `/proxy/iem-obs?tiers=${tiers.join(',')}&bbox=${bboxParam(bbox)}`
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
