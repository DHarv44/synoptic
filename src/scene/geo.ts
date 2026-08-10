import { Vector3 } from 'three'

export const GLOBE_RADIUS = 1
const DEG = Math.PI / 180

/** lat/lon (degrees) → unit-sphere position. East-positive longitudes. */
export function latLonToVec3(lat: number, lon: number, radius = GLOBE_RADIUS): Vector3 {
  const latR = lat * DEG
  const lonR = lon * DEG
  return new Vector3(
    radius * Math.cos(latR) * Math.cos(lonR),
    radius * Math.sin(latR),
    -radius * Math.cos(latR) * Math.sin(lonR),
  )
}

export function vec3ToLatLon(v: Vector3): { lat: number; lon: number } {
  const r = v.length()
  return {
    lat: Math.asin(v.y / r) / DEG,
    lon: -Math.atan2(v.z, v.x) / DEG,
  }
}

/**
 * Subsolar point (where the sun is overhead) for a UTC timestamp.
 * Approximate declination + hour angle; good to ~2°, plenty for a terminator.
 */
export function subsolarPoint(ms: number): { lat: number; lon: number } {
  const d = new Date(ms)
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 0)
  const dayOfYear = (ms - yearStart) / 86_400_000
  const declination = -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10))
  const utcHours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600
  let lon = (12 - utcHours) * 15
  if (lon > 180) lon -= 360
  if (lon < -180) lon += 360
  return { lat: declination, lon }
}
