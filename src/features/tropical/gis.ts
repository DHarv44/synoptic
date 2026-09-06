import { reportError, reportOk } from '@/core/data/healthStore'
import { fixtureActive, loadFixture } from '@/core/data/fixtures'
import { NHC_GIS, type ActiveStorm } from '@/features/tropical/service'

/**
 * NOAA's tropical map service serves each storm's products as GeoJSON in a
 * per-slot layer group ("EP3 Forecast Cone" …); slot ids differ per basin,
 * so the layer index is resolved by name once and kept. Verified live
 * 2026-09-06 against Hurricane Marie: cone Polygon, 8 forecast points with
 * maxwind/gust/mslp/ssnum/datelbl/tau/validtime, track LineString, past
 * track segments, 31 past points with intensity.
 */
const BASE = '/proxy/nhc-gis'

export const STORM_LAYERS = {
  cone: 'Forecast Cone',
  track: 'Forecast Track',
  points: 'Forecast Points',
  past: 'Past Track',
  pastPoints: 'Past Points',
  /** 34/50/64 kt quadrant polygons per forecast hour (tau 0 = now). */
  windRadii: 'Forecast Wind Radii',
  /** Isochrones (polylines, `arrival_time`); present only with a land threat. */
  arrivalLikely: 'Most Likely Arrival Time',
  arrivalEarliest: 'Earliest Reasonable Arrival Time',
  /** Coastal segments (polylines, `tcww` HWA/HWR/TWA/TWR); schema verified, no live sample. */
  watchWarn: 'Watch-Warning',
} as const

export type StormLayerKey = keyof typeof STORM_LAYERS

export type StormGis = Record<StormLayerKey, GeoJSON.FeatureCollection>

export const EMPTY_FC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

let layerIndex: Promise<Map<string, number>> | null = null

/** "EP3 Forecast Cone" → layer id, from the service's own layer list. */
function layerIds(): Promise<Map<string, number>> {
  layerIndex ??= (async () => {
    const res = await fetch(`${BASE}?f=json`)
    if (!res.ok) throw new Error(`NHC GIS index HTTP ${res.status}`)
    const json = (await res.json()) as { layers?: Array<{ id: number; name: string }> }
    return new Map((json.layers ?? []).map((l) => [l.name, l.id]))
  })().catch((e: unknown) => {
    layerIndex = null
    throw e
  })
  return layerIndex
}

/**
 * ArcGIS answers a bad or empty query with 200 and `{ error: … }` rather
 * than a collection; only a real FeatureCollection is passed on, so a
 * malformed answer can never reach the renderer.
 */
async function fetchLayer(id: number): Promise<GeoJSON.FeatureCollection> {
  const res = await fetch(`${BASE}/${id}/query?where=1%3D1&outFields=*&f=geojson`)
  if (!res.ok) throw new Error(`NHC GIS layer ${id} HTTP ${res.status}`)
  const json = (await res.json()) as { type?: string; features?: unknown; error?: { message?: string } }
  if (json.error) throw new Error(`NHC GIS layer ${id}: ${json.error.message ?? 'error'}`)
  if (json.type !== 'FeatureCollection' || !Array.isArray(json.features)) return EMPTY_FC
  return json as GeoJSON.FeatureCollection
}

/** Every product for one storm; a missing layer is an empty collection. */
export async function fetchStormGis(storm: ActiveStorm): Promise<StormGis> {
  const empty = (): StormGis => ({
    cone: EMPTY_FC,
    track: EMPTY_FC,
    points: EMPTY_FC,
    past: EMPTY_FC,
    pastPoints: EMPTY_FC,
    windRadii: EMPTY_FC,
    arrivalLikely: EMPTY_FC,
    arrivalEarliest: EMPTY_FC,
    watchWarn: EMPTY_FC,
  })
  if (fixtureActive()) {
    const all = await loadFixture<Record<string, Partial<StormGis>>>('nhc-gis')
    return { ...empty(), ...(all[storm.id] ?? {}) }
  }
  try {
    const ids = await layerIds()
    const out = empty()
    await Promise.all(
      (Object.keys(STORM_LAYERS) as StormLayerKey[]).map(async (key) => {
        const id = ids.get(`${storm.binNumber} ${STORM_LAYERS[key]}`)
        if (id !== undefined) out[key] = await fetchLayer(id)
      }),
    )
    reportOk(NHC_GIS)
    return out
  } catch (e) {
    reportError(NHC_GIS, e instanceof Error ? e.message : String(e))
    throw e
  }
}
