import { latLonToVec3 } from '@/scene/geo'
import {
  lonLatToTile,
  tileCenter,
  tileHalfAngle,
  tileKey,
  type TileCoord,
} from '@/scene/tiles/mercator'

const MAX_TILES = 48
const ZOOM_SCALE = 6
export const MIN_ZOOM = 1
export const MAX_ZOOM = 6

/** Camera distance from globe center → tile zoom level. */
export function zoomForDistance(dist: number): number {
  const z = Math.floor(Math.log2(ZOOM_SCALE / Math.max(0.05, dist - 1)))
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))
}

/**
 * Tiles covering the visible cap around the sub-camera point: BFS out from
 * the center tile, accepting tiles whose center lies within the horizon
 * angle (plus tile size margin). Capped at MAX_TILES.
 */
export function computeVisibleTiles(camLat: number, camLon: number, dist: number): TileCoord[] {
  const z = zoomForDistance(dist)
  const n = 2 ** z
  const horizon = Math.acos(1 / Math.max(1.0001, dist))
  const margin = tileHalfAngle(z)
  const camDir = latLonToVec3(camLat, camLon, 1)

  const accepts = (t: TileCoord): boolean => {
    const c = tileCenter(t)
    const dir = latLonToVec3(c.lat, c.lon, 1)
    return camDir.dot(dir) > Math.cos(horizon + margin)
  }

  const start = lonLatToTile(camLon, camLat, z)
  const out: TileCoord[] = []
  const seen = new Set<string>()
  const queue: TileCoord[] = [start]
  seen.add(tileKey(start))

  while (queue.length > 0 && out.length < MAX_TILES) {
    const t = queue.shift() as TileCoord
    if (!accepts(t)) continue
    out.push(t)
    const neighbors: TileCoord[] = [
      { z, x: (t.x + 1) % n, y: t.y },
      { z, x: (t.x - 1 + n) % n, y: t.y },
      { z, x: t.x, y: t.y + 1 },
      { z, x: t.x, y: t.y - 1 },
    ]
    for (const nb of neighbors) {
      if (nb.y < 0 || nb.y >= n) continue
      const key = tileKey(nb)
      if (!seen.has(key)) {
        seen.add(key)
        queue.push(nb)
      }
    }
  }
  return out
}
