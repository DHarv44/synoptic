import { fetchJson } from '@/core/data/fetchJson'
import { OPEN_METEO } from '@/core/data/openMeteo/forecast'

/** Pressure levels served by Open-Meteo, high to low pressure. */
export const SOUNDING_LEVELS = [
  1000, 975, 950, 925, 900, 850, 800, 700, 600, 500, 400, 300, 250, 200, 150, 100, 70, 50, 30,
] as const

export interface SoundingLevel {
  p: number // hPa
  T: number // °C
  Td: number // °C
  ws: number // m/s
  wd: number // deg (from)
  z: number // geopotential height, m
}

/** One vertical profile at a specific hour. Ordered surfaceward-first (high p → low p). */
export interface Sounding {
  timeMs: number
  levels: SoundingLevel[]
}

interface SoundingResponse {
  hourly: Record<string, Array<number | null>> & { time: string[] }
}

function soundingUrl(lat: number, lon: number): string {
  const vars = SOUNDING_LEVELS.flatMap((p) => [
    `temperature_${p}hPa`,
    `relative_humidity_${p}hPa`,
    `wind_speed_${p}hPa`,
    `wind_direction_${p}hPa`,
    `geopotential_height_${p}hPa`,
  ])
  const q = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: vars.join(','),
    timezone: 'UTC',
    forecast_days: '2',
    past_days: '1',
    wind_speed_unit: 'ms',
  })
  return `https://api.open-meteo.com/v1/forecast?${q}`
}

/** Magnus dewpoint from T (°C) and RH (%). */
export function dewpointFromRh(tC: number, rhPct: number): number {
  const rh = Math.max(rhPct, 0.1) / 100
  const gamma = Math.log(rh) + (17.625 * tC) / (243.04 + tC)
  return (243.04 * gamma) / (17.625 - gamma)
}

export async function fetchSoundingSeries(lat: number, lon: number): Promise<SoundingResponse> {
  return fetchJson<SoundingResponse>(OPEN_METEO, soundingUrl(lat, lon), {
    fixture: 'openmeteo-sounding',
  })
}

/** Extract the profile at the hour nearest simTime. */
export function soundingAt(res: SoundingResponse, simTimeMs: number): Sounding | null {
  const times = res.hourly.time.map((t) => Date.parse(t + 'Z'))
  if (times.length === 0) return null
  let hi = 0
  for (let i = 0; i < times.length; i++) {
    if (Math.abs(times[i] - simTimeMs) < Math.abs(times[hi] - simTimeMs)) hi = i
  }
  const levels: SoundingLevel[] = []
  for (const p of SOUNDING_LEVELS) {
    const T = res.hourly[`temperature_${p}hPa`]?.[hi]
    const rh = res.hourly[`relative_humidity_${p}hPa`]?.[hi]
    const ws = res.hourly[`wind_speed_${p}hPa`]?.[hi]
    const wd = res.hourly[`wind_direction_${p}hPa`]?.[hi]
    const z = res.hourly[`geopotential_height_${p}hPa`]?.[hi]
    if (T == null || rh == null || ws == null || wd == null || z == null) continue
    levels.push({ p, T, Td: dewpointFromRh(T, rh), ws, wd, z })
  }
  return levels.length >= 5 ? { timeMs: times[hi], levels } : null
}
