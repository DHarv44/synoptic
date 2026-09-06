import { fetchJson } from '@/core/data/fetchJson'
import type { SourceRef } from '@/core/data/types'

export const NHC: SourceRef = { id: 'nhc', label: 'NHC active storms' }
export const NHC_GIS: SourceRef = { id: 'nhc-gis', label: 'NHC forecast products' }

export interface ActiveStorm {
  /** e.g. 'ep132026'. */
  id: string
  /** Map-service slot, e.g. 'EP3'. */
  binNumber: string
  name: string
  /** NHC classification: HU, TS, TD, STS, STD, PTC, EX, … */
  classification: string
  intensityKt: number
  pressureMb: number | null
  lat: number
  lon: number
  movementDir: number | null
  movementSpeedKt: number | null
  lastUpdateMs: number
  advNum: string
  advisoryUrl: string
  /** Forecast discussion page, when NHC publishes one for the storm. */
  discussionUrl: string | null
}

interface CurrentStormsResponse {
  activeStorms: Array<{
    id: string
    binNumber: string
    name: string
    classification: string
    intensity: string | number
    pressure: string | number
    latitudeNumeric: number
    longitudeNumeric: number
    movementDir: number | null
    movementSpeed: number | null
    lastUpdate: string
    publicAdvisory: { advNum: string; issuance: string; url: string }
    forecastDiscussion?: { url: string }
  }>
}

const num = (v: string | number | null | undefined): number | null => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** NHC's active-storm list: Atlantic, East and Central Pacific. */
export async function fetchActiveStorms(): Promise<ActiveStorm[]> {
  const res = await fetchJson<CurrentStormsResponse>(NHC, '/proxy/nhc-storms', {
    fixture: 'nhc-storms',
  })
  return res.activeStorms.map((s) => ({
    id: s.id,
    binNumber: s.binNumber,
    name: s.name,
    classification: s.classification,
    intensityKt: Number(s.intensity) || 0,
    pressureMb: num(s.pressure),
    lat: s.latitudeNumeric,
    lon: s.longitudeNumeric,
    movementDir: s.movementDir ?? null,
    movementSpeedKt: s.movementSpeed ?? null,
    lastUpdateMs: Date.parse(s.lastUpdate),
    advNum: s.publicAdvisory.advNum,
    advisoryUrl: s.publicAdvisory.url,
    discussionUrl: s.forecastDiscussion?.url ?? null,
  }))
}

/** Category keys, Saffir-Simpson above tropical-storm strength. */
export type CategoryKey = 'TD' | 'TS' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'other'

/**
 * The standard Saffir-Simpson palette — the same colours NHC, Wikipedia and
 * every tracking site use, so a category reads without a legend. A chart
 * convention, fixed.
 */
export const CATEGORY_COLORS: Record<CategoryKey, string> = {
  TD: '#5ebaff',
  TS: '#00faf4',
  C1: '#ffffcc',
  C2: '#ffe775',
  C3: '#ffc140',
  C4: '#ff8f20',
  C5: '#ff6060',
  other: '#c0c8d0',
}

/**
 * Category from NHC's type code and wind. Hurricanes grade by wind on the
 * Saffir-Simpson thresholds (64/83/96/113/137 kt); subtropical and
 * post-tropical systems keep their own labels rather than borrowing one.
 */
export function stormCategory(classification: string, kt: number): { key: CategoryKey; label: string } {
  const c = classification.toUpperCase()
  if (c === 'HU' || (c === 'PTC' && kt >= 64) || (c === 'EX' && kt >= 64)) {
    if (kt >= 137) return { key: 'C5', label: 'Cat 5' }
    if (kt >= 113) return { key: 'C4', label: 'Cat 4' }
    if (kt >= 96) return { key: 'C3', label: 'Cat 3' }
    if (kt >= 83) return { key: 'C2', label: 'Cat 2' }
    return { key: 'C1', label: 'Cat 1' }
  }
  if (c === 'TS') return { key: 'TS', label: 'Tropical storm' }
  if (c === 'TD') return { key: 'TD', label: 'Tropical depression' }
  if (c === 'STS') return { key: 'TS', label: 'Subtropical storm' }
  if (c === 'STD') return { key: 'TD', label: 'Subtropical depression' }
  if (c === 'PTC') return { key: 'other', label: 'Potential tropical cyclone' }
  if (c === 'EX') return { key: 'other', label: 'Post-tropical' }
  if (c === 'DB' || c === 'LO') return { key: 'other', label: 'Disturbance' }
  return { key: 'other', label: c }
}

/** The forecast-point type codes map the same way; STD/STS are subtropical. */
export function pointCategory(stormtype: string, maxwind: number): { key: CategoryKey; label: string } {
  return stormCategory(stormtype, maxwind)
}

/**
 * A forecast point's `validtime` is 'DD/HHMM' with no month or year; the
 * advisory's issue time supplies them. A day number far below the issue
 * day means the forecast crossed into the next month.
 */
export function validTimeMs(validtime: string, issuedMs: number): number | null {
  const m = /^(\d{2})\/(\d{2})(\d{2})$/.exec(validtime)
  if (!m) return null
  const d = new Date(issuedMs)
  let year = d.getUTCFullYear()
  let month = d.getUTCMonth()
  const day = Number(m[1])
  if (day < d.getUTCDate() - 15) {
    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
  }
  return Date.UTC(year, month, day, Number(m[2]), Number(m[3]))
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']

/** "NW 8 kt", or "stationary" — the way an advisory states motion. */
export function motionText(dir: number | null, spdKt: number | null): string {
  if (spdKt === null || spdKt === 0) return 'stationary'
  const d = dir === null ? '' : `${COMPASS[Math.round(dir / 22.5) % 16]} `
  return `${d}${spdKt} kt`
}
