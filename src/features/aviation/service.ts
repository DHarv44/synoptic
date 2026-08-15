import type { SourceRef } from '@/core/data/types'

export const AWC: SourceRef = { id: 'awc-hazards', label: 'Aviation hazards (AWC)' }

/** SIGMETs are issued nationally; no bbox parameter exists or is needed. */
export const SIGMET_URL = '/proxy/awc/airsigmet?format=json&type=sigmet'

/** PIREPs require a bbox upstream; hours of history kept short — they age fast. */
export function pirepUrl(latMin: number, lonMin: number, latMax: number, lonMax: number): string {
  return `/proxy/awc/pirep?format=json&age=2&bbox=${latMin},${lonMin},${latMax},${lonMax}`
}

export interface AirSigmet {
  airSigmetType: string
  hazard: string
  validTimeFrom: number // unix seconds
  validTimeTo: number
  altitudeHi1: number | null
  altitudeLow1: number | null
  movementDir: number | null
  movementSpd: number | null
  rawAirSigmet: string
  coords: Array<{ lat: number; lon: number }> | null
}

export interface Pirep {
  lat: number
  lon: number
  obsTime: number // unix seconds
  acType: string
  fltLvl: string | number
  pirepType: string
  icgInt1: string
  tbInt1: string
  rawOb: string
}

/** Hazard → colour. Same discipline as alerts: hue belongs to the data. */
export function sigmetColor(hazard: string): string {
  switch (hazard) {
    case 'CONVECTIVE':
      return 'var(--mantine-color-red-6)'
    case 'TURB':
      return 'var(--mantine-color-orange-5)'
    case 'ICE':
    case 'ICING':
      return 'var(--mantine-color-cyan-5)'
    case 'IFR':
      return 'var(--mantine-color-indigo-4)'
    case 'MTW':
    case 'MTN OBSCN':
      return 'var(--mantine-color-violet-5)'
    default:
      return 'var(--mantine-color-gray-5)'
  }
}

/** Currently valid, with a drawable polygon. */
export function activeSigmets(items: AirSigmet[], nowMs: number): AirSigmet[] {
  const nowS = nowMs / 1000
  return items.filter(
    (s) =>
      s.validTimeFrom <= nowS &&
      nowS <= s.validTimeTo &&
      (s.coords?.length ?? 0) >= 3,
  )
}

/** Callers pass `activeSigmets` output, whose filter guarantees ≥3 coords. */
export function sigmetGeoJSON(items: AirSigmet[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: items.map((s) => {
      const coords = s.coords ?? []
      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          // AWC polygons are not explicitly closed; MapLibre wants a ring.
          coordinates: [[...coords, coords[0]].map((c) => [c.lon, c.lat])],
        },
        properties: { color: sigmetColor(s.hazard), hazard: s.hazard },
      }
    }),
  }
}

/**
 * Worst reported intensity, 0–3, from the icing and turbulence fields.
 * AWC encodes ranges like "LGT-MOD"; the upper bound is the one that
 * matters to the next aircraft through.
 */
export function pirepSeverity(p: Pirep): number {
  const worst = (s: string): number => {
    if (/SEV|EXTM/.test(s)) return 3
    if (/MOD/.test(s)) return 2
    if (/LGT/.test(s)) return 1
    return 0
  }
  const reported = Math.max(worst(p.icgInt1 ?? ''), Math.max(worst(p.tbInt1 ?? ''), 0))
  // An urgent PIREP is severe by declaration, whatever the parsed fields say.
  return p.pirepType === 'Urgent PIREP' ? Math.max(reported, 3) : reported
}

const PIREP_COLORS = [
  'var(--mantine-color-gray-5)',
  'var(--mantine-color-yellow-5)',
  'var(--mantine-color-orange-5)',
  'var(--mantine-color-red-6)',
]

export function pirepGeoJSON(items: Pirep[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: items
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
      .map((p) => {
        const sev = pirepSeverity(p)
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
          properties: { sev, color: PIREP_COLORS[sev] },
        }
      }),
  }
}
