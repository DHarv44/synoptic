import type { SourceRef } from '@/core/data/types'

export const OPEN_METEO: SourceRef = { id: 'open-meteo', label: 'Open-Meteo' }

const CURRENT_FIELDS = [
  'temperature_2m',
  'relative_humidity_2m',
  'dew_point_2m',
  'apparent_temperature',
  'pressure_msl',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'weather_code',
  'cloud_cover',
  'precipitation',
].join(',')

const HOURLY_FIELDS = [
  'temperature_2m',
  'dew_point_2m',
  'precipitation',
  'precipitation_probability',
  'wind_speed_10m',
  'wind_direction_10m',
  'cloud_cover',
  'pressure_msl',
  'weather_code',
].join(',')

const DAILY_FIELDS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'precipitation_probability_max',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
].join(',')

/** How far the daily outlook runs. Open-Meteo serves up to 16 days free. */
export const FORECAST_DAYS = 10

export function forecastUrl(lat: number, lon: number): string {
  const p = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: CURRENT_FIELDS,
    hourly: HOURLY_FIELDS,
    daily: DAILY_FIELDS,
    timezone: 'UTC',
    forecast_days: String(FORECAST_DAYS),
    wind_speed_unit: 'ms',
  })
  return `https://api.open-meteo.com/v1/forecast?${p}`
}

/** WMO weather interpretation codes → short text. */
const WMO: Record<number, string> = {
  0: 'Clear',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Freezing drizzle',
  57: 'Freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Light showers',
  81: 'Showers',
  82: 'Violent showers',
  85: 'Snow showers',
  86: 'Snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm w/ hail',
  99: 'Thunderstorm w/ hail',
}

export function wmoText(code: number): string {
  return WMO[code] ?? `Code ${code}`
}
