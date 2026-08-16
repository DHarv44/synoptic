import { fetchJson } from '@/core/data/fetchJson'
import type { SourceRef } from '@/core/data/types'

export const OPEN_METEO_AQ: SourceRef = { id: 'openmeteo-aq', label: 'Air quality (Open-Meteo)' }

export interface AirQualityResponse {
  hourly: {
    time: string[]
    us_aqi: Array<number | null>
    pm2_5: Array<number | null>
  }
}

function airQualityUrl(lat: number, lon: number): string {
  const q = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: 'us_aqi,pm2_5',
    timezone: 'UTC',
    forecast_days: '2',
    past_days: '1',
  })
  return `https://air-quality-api.open-meteo.com/v1/air-quality?${q}`
}

export async function fetchAirQuality(lat: number, lon: number): Promise<AirQualityResponse> {
  return fetchJson<AirQualityResponse>(OPEN_METEO_AQ, airQualityUrl(lat, lon), {
    fixture: 'openmeteo-airquality',
  })
}

export interface AirQualityNow {
  timeMs: number
  usAqi: number
  pm25: number | null
}

/** The hour nearest simTime, like soundingAt. */
export function airQualityAt(res: AirQualityResponse, simTimeMs: number): AirQualityNow | null {
  const times = res.hourly.time.map((t) => Date.parse(t + 'Z'))
  let hi = -1
  for (let i = 0; i < times.length; i++) {
    if (res.hourly.us_aqi[i] === null) continue
    if (hi === -1 || Math.abs(times[i] - simTimeMs) < Math.abs(times[hi] - simTimeMs)) hi = i
  }
  if (hi === -1) return null
  const usAqi = res.hourly.us_aqi[hi]
  if (usAqi === null) return null
  return { timeMs: times[hi], usAqi, pm25: res.hourly.pm2_5[hi] ?? null }
}

/** EPA US AQI category names, by breakpoint. */
export function aqiCategory(usAqi: number): string {
  if (usAqi <= 50) return 'Good'
  if (usAqi <= 100) return 'Moderate'
  if (usAqi <= 150) return 'Unhealthy for sensitive groups'
  if (usAqi <= 200) return 'Unhealthy'
  if (usAqi <= 300) return 'Very unhealthy'
  return 'Hazardous'
}
