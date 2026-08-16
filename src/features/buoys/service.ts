import type { SourceRef } from '@/core/data/types'
import { MAP_COLORS as C } from '@/core/mapColors'
import type { UnitSystem } from '@/core/units/useUnitSystem'

export const NDBC_SOURCE: SourceRef = { id: 'ndbc', label: 'Buoys (NDBC)' }

/** Served by our proxy, which parses NDBC's fixed-width text to JSON. */
export const BUOYS_URL = '/proxy/ndbc'

export interface Buoy {
  id: string
  lat: number
  lon: number
  timeMs: number
  wdir: number | null // deg
  wspd: number | null // m/s
  gst: number | null // m/s
  wvht: number | null // m
  dpd: number | null // s
  pres: number | null // hPa
  atmp: number | null // °C
  wtmp: number | null // °C
}

/** Older than this and the buoy is likely adrift or silent — hide it. */
const STALE_MS = 3 * 3_600_000

/** Stations actually reporting marine data (waves or water temperature). */
export function marineBuoys(buoys: Buoy[], nowMs: number): Buoy[] {
  return buoys.filter(
    (b) => nowMs - b.timeMs < STALE_MS && (b.wvht !== null || b.wtmp !== null),
  )
}

/** Wave-height bins, calm to phenomenal; wave-less stations read as calm. */
export function buoyColor(wvhtM: number | null): string {
  const m = wvhtM ?? 0
  if (m < 0.5) return C.blue4
  if (m < 1.5) return C.cyan4
  if (m < 2.5) return C.yellow5
  if (m < 4) return C.orange5
  return C.red6
}

export function waveLabel(wvhtM: number, system: UnitSystem): string {
  return system === 'imperial' ? `${(wvhtM * 3.28084).toFixed(0)} ft` : `${wvhtM.toFixed(1)} m`
}

export function buoyGeoJSON(buoys: Buoy[], system: UnitSystem): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: buoys.map((b) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [b.lon, b.lat] },
      properties: {
        id: b.id,
        color: buoyColor(b.wvht),
        label: b.wvht !== null ? waveLabel(b.wvht, system) : '',
        // Click-card fields: the raw observation, units applied at render.
        timeMs: b.timeMs,
        wvht: b.wvht,
        dpd: b.dpd,
        wspd: b.wspd,
        gst: b.gst,
        wdir: b.wdir,
        atmp: b.atmp,
        wtmp: b.wtmp,
        pres: b.pres,
      },
    })),
  }
}
