import { cacheGet, cachePut } from '@/core/data/cache'
import { fetchJson } from '@/core/data/fetchJson'
import { fixtureActive } from '@/core/data/fixtures'
import { NWS, type AlertFeature } from '@/core/data/nws/alerts'

/**
 * Zone outlines for zone-referenced alerts, resolved ON DEMAND. Probed
 * 2026-09-05: a zone is ~52 KB of GeometryCollection from
 * api.weather.gov/zones/{type}/{id} (CORS-open, cacheable ~17 days); the
 * batch endpoint ignores include_geometry. With 172 of 191 active alerts
 * zone-based across 788 zones (~40 MB), resolving everything is off the
 * table — so an alert's zones are fetched when someone asks to see it,
 * and kept two weeks so the second look is instant.
 */
export const ZONE_CACHE_MS = 14 * 86_400_000

const LANES = 4

interface ZoneResponse {
  geometry: GeoJSON.Geometry | null
}

/** "https://api.weather.gov/zones/forecast/TXZ213" → "forecast/TXZ213". */
export function zoneKey(url: string): string | null {
  const m = /\/zones\/([a-z]+)\/([A-Z0-9]+)\/?$/.exec(url)
  return m ? `${m[1]}/${m[2]}` : null
}

async function fetchZone(url: string): Promise<GeoJSON.Geometry | null> {
  const key = zoneKey(url)
  if (!key) return null
  const hit = await cacheGet<GeoJSON.Geometry>(`nws-zone:${key}`, ZONE_CACHE_MS)
  if (hit) return hit
  const res = await fetchJson<ZoneResponse>(NWS, url)
  if (res.geometry) await cachePut(`nws-zone:${key}`, res.geometry)
  return res.geometry
}

/** Every polygon inside any geometry, flattened for a single collection. */
export function polygonsOf(g: GeoJSON.Geometry): GeoJSON.Polygon[] {
  switch (g.type) {
    case 'Polygon':
      return [g]
    case 'MultiPolygon':
      return g.coordinates.map((c) => ({ type: 'Polygon', coordinates: c }))
    case 'GeometryCollection':
      return g.geometries.flatMap(polygonsOf)
    default:
      return []
  }
}

/** One collection of all the polygons the alert's zones cover. */
export function unionZones(zones: GeoJSON.Geometry[]): GeoJSON.GeometryCollection {
  return { type: 'GeometryCollection', geometries: zones.flatMap(polygonsOf) }
}

/**
 * Resolve an alert's zones, a few at a time, reporting progress. Throws
 * offline (fixture mode): there is no recording of 788 zones to fall back
 * on, and the card says so rather than pretending.
 */
export async function resolveAlertZones(
  alert: AlertFeature,
  onProgress?: (done: number, total: number) => void,
): Promise<GeoJSON.GeometryCollection> {
  if (fixtureActive()) throw new Error('zone outlines unavailable offline')
  const urls = alert.properties.affectedZones ?? []
  const zones: GeoJSON.Geometry[] = []
  let next = 0
  let done = 0
  const lane = async (): Promise<void> => {
    while (next < urls.length) {
      const url = urls[next++]
      try {
        const g = await fetchZone(url)
        if (g) zones.push(g)
      } finally {
        done++
        onProgress?.(done, urls.length)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(LANES, urls.length) }, lane))
  return unionZones(zones)
}
