/**
 * Web-mercator tile covering for prefetchers. MapLibre's own covering maths
 * is internal; for a viewport-sized fetch-ahead this standard slippy-tile
 * arithmetic names the same tiles a raster source will ask for.
 */

export interface TileCoord {
  z: number
  x: number
  y: number
}

/** Mercator's usable latitude; beyond it y-tile math runs off the pyramid. */
const MAX_LAT = 85.0511

/** Every extra tile is multiplied by the loop's frame count. */
const MAX_TILES = 48

function lonToX(lon: number, z: number): number {
  return Math.floor(((lon + 180) / 360) * 2 ** z)
}

function latToY(lat: number, z: number): number {
  const c = Math.max(-MAX_LAT, Math.min(MAX_LAT, lat))
  const r = (c * Math.PI) / 180
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z)
}

/**
 * Tiles covering a lon/lat box at integer zoom `z`, capped at MAX_TILES
 * (largest viewports simply warm their central portion). An antimeridian-
 * crossing box (west > east) is not split — callers here are viewport
 * prefetchers, and MapLibre bounds never wrap for a same-zoom viewport.
 */
export function coveringTiles(
  west: number,
  south: number,
  east: number,
  north: number,
  z: number,
): TileCoord[] {
  const n = 2 ** z
  const x0 = Math.max(0, lonToX(west, z))
  const x1 = Math.min(n - 1, lonToX(east, z))
  const y0 = Math.max(0, latToY(north, z))
  const y1 = Math.min(n - 1, latToY(south, z))
  const out: TileCoord[] = []
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (out.length >= MAX_TILES) return out
      out.push({ z, x, y })
    }
  }
  return out
}
