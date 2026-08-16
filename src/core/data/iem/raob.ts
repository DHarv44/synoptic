import { fetchJson } from '@/core/data/fetchJson'
import type { SourceRef } from '@/core/data/types'
import type { Sounding, SoundingLevel } from '@/core/data/openMeteo/sounding'

export const IEM_RAOB: SourceRef = { id: 'iem-raob', label: 'Soundings (IEM RAOB)' }

const BASE = 'https://mesonet.agron.iastate.edu'

/** Balloons launch at 00Z/12Z. */
export const SYNOPTIC_MS = 12 * 3_600_000
/** Profiles reach the archive within ~2 h of launch; don't request before that. */
export const RAOB_LAG_MS = 2 * 3_600_000

const KT_TO_MS = 0.514444

export interface RaobLevel {
  pres: number | null
  hght: number | null
  tmpc: number | null
  dwpc: number | null
  drct: number | null
  sknt: number | null
}

export interface RaobResponse {
  profiles: Array<{ station: string; valid: string; profile: RaobLevel[] }>
}

export interface RaobStation {
  id: string
  lat: number
  lon: number
}

interface StationsResponse {
  features: Array<{
    id: string
    geometry: { coordinates: [number, number] }
    properties: { online: boolean }
  }>
}

export async function fetchRaobStations(): Promise<RaobStation[]> {
  const fc = await fetchJson<StationsResponse>(IEM_RAOB, `${BASE}/geojson/network/RAOB.geojson`, {
    fixture: 'iem-raob-stations',
  })
  // `_XXX` ids are area aliases; raob.py returns empty profiles for them.
  return fc.features
    .filter((f) => f.properties.online && !f.id.startsWith('_'))
    .map((f) => ({ id: f.id, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] }))
}

export function raobUrl(tsMs: number, station: string): string {
  const iso = new Date(tsMs).toISOString()
  const ts = iso.slice(0, 10).replace(/-/g, '') + iso.slice(11, 16).replace(':', '')
  return `${BASE}/json/raob.py?ts=${ts}&station=${station}`
}

export async function fetchRaob(tsMs: number, station: string): Promise<RaobResponse> {
  return fetchJson<RaobResponse>(IEM_RAOB, raobUrl(tsMs, station), { fixture: 'iem-raob' })
}

/** Latest 00Z/12Z at or before simTime, held back by the archive lag. */
export function synopticTimeMs(simTimeMs: number, nowMs: number): number {
  const t = Math.min(simTimeMs, nowMs - RAOB_LAG_MS)
  return Math.floor(t / SYNOPTIC_MS) * SYNOPTIC_MS
}

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = Math.PI / 180
  const dLat = (bLat - aLat) * rad
  const dLon = (bLon - aLon) * rad
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

export interface NearestStation {
  station: RaobStation
  distanceKm: number
}

export function nearestStation(
  stations: RaobStation[],
  lat: number,
  lon: number,
): NearestStation | null {
  let best: NearestStation | null = null
  for (const s of stations) {
    const d = haversineKm(lat, lon, s.lat, s.lon)
    if (best === null || d < best.distanceKm) best = { station: s, distanceKm: d }
  }
  return best
}

/**
 * Convert a RAOB profile to the app-wide Sounding shape. Thermodynamic
 * levels (T and Td both reported) form the profile; wind is reported on
 * its own set of levels and is interpolated to them in log-pressure.
 */
export function toSounding(res: RaobResponse): Sounding | null {
  const prof = res.profiles[0]
  if (!prof) return null

  const thermo: Array<{ p: number; z: number; T: number; Td: number }> = []
  // Wind levels as u/v against ln(p), ordered surfaceward-first like the wire data.
  const wind: Array<{ lnp: number; u: number; v: number }> = []
  for (const l of prof.profile) {
    if (l.pres === null) continue
    if (l.hght !== null && l.tmpc !== null && l.dwpc !== null) {
      thermo.push({ p: l.pres, z: l.hght, T: l.tmpc, Td: l.dwpc })
    }
    if (l.drct !== null && l.sknt !== null) {
      const ws = l.sknt * KT_TO_MS
      const dir = (l.drct * Math.PI) / 180
      wind.push({ lnp: Math.log(l.pres), u: -ws * Math.sin(dir), v: -ws * Math.cos(dir) })
    }
  }
  if (thermo.length < 5) return null

  const windAt = (lnp: number): { ws: number; wd: number } => {
    if (wind.length === 0) return { ws: 0, wd: 0 }
    let u: number, v: number
    if (lnp >= wind[0].lnp) {
      ;({ u, v } = wind[0])
    } else if (lnp <= wind[wind.length - 1].lnp) {
      ;({ u, v } = wind[wind.length - 1])
    } else {
      let i = 1
      while (wind[i].lnp > lnp) i++
      const a = wind[i - 1]
      const b = wind[i]
      const f = (lnp - a.lnp) / (b.lnp - a.lnp)
      u = a.u + f * (b.u - a.u)
      v = a.v + f * (b.v - a.v)
    }
    const ws = Math.hypot(u, v)
    const wd = ws < 0.01 ? 0 : (Math.atan2(-u, -v) * 180) / Math.PI
    return { ws, wd: (wd + 360) % 360 }
  }

  const levels: SoundingLevel[] = thermo.map((l) => {
    const w = windAt(Math.log(l.p))
    return { p: l.p, T: l.T, Td: l.Td, z: l.z, ws: w.ws, wd: w.wd }
  })
  return { timeMs: Date.parse(prof.valid), levels }
}
