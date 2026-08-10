/** Web Mercator slippy-tile math (EPSG:3857 tiling scheme). */

export interface TileCoord {
  z: number
  x: number
  y: number
}

export const MERCATOR_MAX_LAT = 85.0511287798
const DEG = Math.PI / 180

export function tileKey(t: TileCoord): string {
  return `${t.z}/${t.x}/${t.y}`
}

/** lon/lat → tile indices (floored) at zoom z. */
export function lonLatToTile(lon: number, lat: number, z: number): TileCoord {
  const n = 2 ** z
  const clampedLat = Math.max(-MERCATOR_MAX_LAT, Math.min(MERCATOR_MAX_LAT, lat))
  const x = Math.floor(((lon + 180) / 360) * n)
  const yFrac =
    (1 - Math.log(Math.tan(clampedLat * DEG) + 1 / Math.cos(clampedLat * DEG)) / Math.PI) / 2
  const y = Math.floor(yFrac * n)
  return {
    z,
    x: Math.min(n - 1, Math.max(0, x)),
    y: Math.min(n - 1, Math.max(0, y)),
  }
}

/** Fractional tile position (x + fx, y + fy in [0,1)) → lon/lat. */
export function tileFracToLonLat(z: number, xf: number, yf: number): { lon: number; lat: number } {
  const n = 2 ** z
  const lon = (xf / n) * 360 - 180
  const lat = Math.atan(Math.sinh(Math.PI * (1 - (2 * yf) / n))) / DEG
  return { lon, lat }
}

export function tileCenter(t: TileCoord): { lon: number; lat: number } {
  return tileFracToLonLat(t.z, t.x + 0.5, t.y + 0.5)
}

/** Rough angular half-size of a tile at zoom z, radians (equator-worst-case). */
export function tileHalfAngle(z: number): number {
  return ((360 / 2 ** z / 2) * DEG * Math.SQRT2)
}
