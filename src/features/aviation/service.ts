import type { SourceRef } from '@/core/data/types'
import { MAP_COLORS as C } from '@/core/mapColors'

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
      return C.red6
    case 'TURB':
      return C.orange5
    case 'ICE':
    case 'ICING':
      return C.cyan5
    case 'IFR':
      return C.indigo4
    case 'MTW':
    case 'MTN OBSCN':
      return C.violet5
    default:
      return C.gray5
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
        properties: {
          color: sigmetColor(s.hazard),
          hazard: s.hazard,
          // Click-card fields.
          rawAirSigmet: s.rawAirSigmet,
          validTimeTo: s.validTimeTo,
          altitudeLow1: s.altitudeLow1,
          altitudeHi1: s.altitudeHi1,
        },
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

const PIREP_COLORS = [C.gray5, C.yellow5, C.orange5, C.red6]

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
          properties: {
            sev,
            color: PIREP_COLORS[sev],
            // Click-card fields: the pilot's own words, mostly.
            rawOb: p.rawOb,
            acType: p.acType,
            fltLvl: String(p.fltLvl),
            obsTime: p.obsTime,
            pirepType: p.pirepType,
          },
        }
      }),
  }
}
