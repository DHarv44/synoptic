import { reportError, reportOk } from '@/core/data/healthStore'
import { fetchJson } from '@/core/data/fetchJson'
import { fixtureActive, loadFixture } from '@/core/data/fixtures'
import type { SourceRef } from '@/core/data/types'
import { MAP_COLORS as C } from '@/core/mapColors'
import {
  parseVaa,
  VAA_MAX_AGE_MS,
  VAA_SLOTS,
  type VolcanicAshAdvisory,
} from '@/features/volcanoes/vaa'

export const GVP: SourceRef = { id: 'gvp', label: 'Volcanoes (Smithsonian GVP)' }
export const USGS_VOLCANO: SourceRef = { id: 'usgs-volcano', label: 'US volcano alerts (USGS)' }
export const VAAC: SourceRef = { id: 'vaac', label: 'Volcanic ash advisories (VAACs)' }
export const USGS_QUAKES: SourceRef = { id: 'usgs-quakes', label: 'Seismicity (USGS ANSS)' }

/** Trimmed via WFS propertyName: 465 KB for the full Holocene list. */
const GVP_URL =
  '/proxy/gvp?service=WFS&version=2.0.0&request=GetFeature' +
  '&typeName=GVP-VOTW:Smithsonian_VOTW_Holocene_Volcanoes&outputFormat=json' +
  '&propertyName=GeoLocation,Volcano_Number,Volcano_Name,Primary_Volcano_Type,Last_Eruption_Year,Country,Elevation'

const USGS_URL = 'https://volcanoes.usgs.gov/vsc/api/volcanoApi/elevated'

export interface Volcano {
  number: number
  name: string
  type: string
  lastEruptionYear: number | null
  country: string
  elevation: number | null
  lat: number
  lon: number
}

interface GvpResponse {
  features: Array<{
    geometry: { coordinates: [number, number] } | null
    properties: {
      Volcano_Number: number
      Volcano_Name: string
      Primary_Volcano_Type: string
      Last_Eruption_Year: number | null
      Country: string
      Elevation: number | null
    }
  }>
}

export async function fetchVolcanoes(): Promise<Volcano[]> {
  const res = await fetchJson<GvpResponse>(GVP, GVP_URL, { fixture: 'gvp-volcanoes' })
  return res.features
    .filter((f) => f.geometry !== null)
    .map((f) => ({
      number: f.properties.Volcano_Number,
      name: f.properties.Volcano_Name,
      type: f.properties.Primary_Volcano_Type,
      lastEruptionYear: f.properties.Last_Eruption_Year,
      country: f.properties.Country,
      elevation: f.properties.Elevation,
      lat: (f.geometry as { coordinates: [number, number] }).coordinates[1],
      lon: (f.geometry as { coordinates: [number, number] }).coordinates[0],
    }))
}

export interface UsgsNotice {
  noticeId?: string
  vName: string
  vnum: string
  lat: number
  long: number
  alertLevel: string // NORMAL | ADVISORY | WATCH | WARNING
  colorCode: string // GREEN | YELLOW | ORANGE | RED
  noticeSynopsis: string
  sentUtc: string
}

export async function fetchElevatedUs(): Promise<UsgsNotice[]> {
  return fetchJson<UsgsNotice[]>(USGS_VOLCANO, USGS_URL, { fixture: 'usgs-volcanoes' })
}

/**
 * Poll every VAAC bulletin slot; slots are advisory files, not volcanoes,
 * and a quiet slot holds its last (stale) advisory — the age filter is the
 * activity test. Text transport, so health and fixtures are manual.
 */
export async function fetchAshAdvisories(nowMs: number): Promise<VolcanicAshAdvisory[]> {
  try {
    let texts: string[]
    if (fixtureActive()) {
      texts = (await loadFixture<{ texts: string[] }>('vaa-bulletins')).texts
    } else {
      const settled = await Promise.allSettled(
        VAA_SLOTS.map(async (slot) => {
          const res = await fetch(`/proxy/vaa/${slot}`)
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.text()
        }),
      )
      texts = settled
        .filter((s): s is PromiseFulfilledResult<string> => s.status === 'fulfilled')
        .map((s) => s.value)
      if (texts.length === 0) throw new Error('no VAA slot reachable')
    }
    const advisories = texts
      .map(parseVaa)
      .filter((a): a is VolcanicAshAdvisory => a !== null)
      .filter((a) => a.issuedMs !== null && nowMs - a.issuedMs < VAA_MAX_AGE_MS)
    reportOk(VAAC)
    return advisories
  } catch (e) {
    reportError(VAAC, e instanceof Error ? e.message : String(e))
    throw e
  }
}

export interface VolcanoQuake {
  lat: number
  lon: number
  mag: number | null
  depthKm: number
  timeMs: number
}

export const QUAKE_RADIUS_KM = 30
export const QUAKE_DAYS = 7

interface FdsnResponse {
  features: Array<{
    geometry: { coordinates: [number, number, number] }
    properties: { mag: number | null; time: number }
  }>
}

/**
 * Located earthquakes near a volcano, the way observatories watch one.
 * Honesty note carried into the card: ANSS is dense where US networks
 * report (AVO, HVO…) and only M4.5+ elsewhere — an empty answer abroad
 * means "not catalogued", not "not shaking".
 */
export async function fetchQuakesNear(lat: number, lon: number): Promise<VolcanoQuake[]> {
  const start = new Date(Date.now() - QUAKE_DAYS * 86400_000).toISOString().slice(0, 10)
  const url =
    'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson' +
    `&latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}` +
    `&maxradiuskm=${QUAKE_RADIUS_KM}&starttime=${start}&orderby=time`
  const res = await fetchJson<FdsnResponse>(USGS_QUAKES, url, { fixture: 'usgs-quakes' })
  return res.features.map((f) => ({
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
    depthKm: f.geometry.coordinates[2],
    mag: f.properties.mag,
    timeMs: f.properties.time,
  }))
}

/** Marker status, worst-first. */
export type VolcanoStatus = 'erupting' | 'watch' | 'advisory' | 'quiet'

export const STATUS_COLORS: Record<VolcanoStatus, string> = {
  erupting: C.red6,
  watch: C.orange5,
  advisory: C.yellow5,
  quiet: '#8a939c',
}

/**
 * Status merges two authorities: USGS alert levels for US volcanoes, and —
 * globally — a live ash advisory means the volcano is erupting, whatever
 * any database says. The VAA join key is the Smithsonian volcano number.
 */
export function volcanoStatus(
  v: Volcano,
  usgsByNumber: Map<number, UsgsNotice>,
  vaaNumbers: Set<number>,
): VolcanoStatus {
  if (vaaNumbers.has(v.number)) return 'erupting'
  const n = usgsByNumber.get(v.number)
  if (n) {
    if (n.colorCode === 'RED' || n.alertLevel === 'WARNING') return 'erupting'
    if (n.colorCode === 'ORANGE' || n.alertLevel === 'WATCH') return 'watch'
    if (n.colorCode === 'YELLOW' || n.alertLevel === 'ADVISORY') return 'advisory'
  }
  return 'quiet'
}

export function volcanoGeoJSON(
  volcanoes: Volcano[],
  usgs: UsgsNotice[],
  advisories: VolcanicAshAdvisory[],
  showAll: boolean,
): GeoJSON.FeatureCollection {
  const usgsByNumber = new Map(usgs.map((n) => [Number(n.vnum), n]))
  const vaaNumbers = new Set(
    advisories.map((a) => a.volcanoNumber).filter((n): n is number => n !== null),
  )
  return {
    type: 'FeatureCollection',
    features: volcanoes
      .map((v) => ({ v, status: volcanoStatus(v, usgsByNumber, vaaNumbers) }))
      .filter(({ status }) => showAll || status !== 'quiet')
      .map(({ v, status }) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [v.lon, v.lat] },
        properties: {
          status,
          rank: status === 'erupting' ? 3 : status === 'watch' ? 2 : status === 'advisory' ? 1 : 0,
          name: v.name,
          number: v.number,
          lat: v.lat,
          lon: v.lon,
          country: v.country,
          vtype: v.type,
          elevation: v.elevation,
          lastEruptionYear: v.lastEruptionYear,
          synopsis: usgsByNumber.get(v.number)?.noticeSynopsis ?? '',
          alertLevel: usgsByNumber.get(v.number)?.alertLevel ?? '',
        },
      })),
  }
}

/** Ash polygons for the map: observed solid, forecasts dashed and fading. */
export function ashGeoJSON(advisories: VolcanicAshAdvisory[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []
  for (const a of advisories) {
    for (const t of a.timesteps) {
      const observed = t.step === 'OBS' || t.step === 'EST'
      for (const p of t.polygons) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[...p.points, p.points[0]].map((pt) => [pt.lon, pt.lat])],
          },
          properties: {
            observed,
            step: t.step,
            levels: p.levels,
            movement: p.movement ?? '',
            volcano: a.volcanoName,
            // +6 fades less than +18: further forecasts, fainter lines.
            fade: observed ? 1 : t.step === '+6' ? 0.75 : t.step === '+12' ? 0.55 : 0.4,
          },
        })
      }
    }
  }
  return { type: 'FeatureCollection', features }
}
