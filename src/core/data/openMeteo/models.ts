import type { SourceRef } from '@/core/data/types'

export const MODELS_SOURCE: SourceRef = { id: 'open-meteo-models', label: 'Open-Meteo models' }
export const ENSEMBLE_SOURCE: SourceRef = { id: 'open-meteo-ens', label: 'Open-Meteo ensemble' }

export interface ModelDef {
  key: string // API model id
  label: string
  color: string
}

export const MODELS: ModelDef[] = [
  { key: 'gfs_seamless', label: 'GFS', color: 'var(--mantine-color-red-6)' },
  { key: 'ecmwf_ifs025', label: 'ECMWF', color: 'var(--mantine-color-blue-5)' },
  { key: 'icon_seamless', label: 'ICON', color: 'var(--mantine-color-green-6)' },
  { key: 'gem_seamless', label: 'GEM', color: 'var(--mantine-color-violet-5)' },
  { key: 'ukmo_seamless', label: 'UKMO', color: 'var(--mantine-color-orange-5)' },
  // ECMWF's ML model — a genuinely different forecasting philosophy in the
  // agreement panel. Verified live on Open-Meteo 2026-08-15.
  { key: 'ecmwf_aifs025', label: 'AIFS', color: 'var(--mantine-color-cyan-5)' },
]

export const MODEL_VARS = [
  { key: 'temperature_2m', label: 'Temperature' },
  { key: 'precipitation', label: 'Precip (mm/h)' },
  { key: 'wind_speed_10m', label: 'Wind (m/s)' },
] as const

export interface HourlyByModel {
  hourly: Record<string, Array<number | null>> & { time: string[] }
}

export function modelsUrl(lat: number, lon: number): string {
  const q = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    models: MODELS.map((m) => m.key).join(','),
    hourly: MODEL_VARS.map((v) => v.key).join(','),
    forecast_days: '10',
    timezone: 'UTC',
    wind_speed_unit: 'ms',
  })
  return `https://api.open-meteo.com/v1/forecast?${q}`
}

export function ensembleUrl(lat: number, lon: number): string {
  const q = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    models: 'gfs025',
    hourly: 'temperature_2m',
    forecast_days: '10',
    timezone: 'UTC',
  })
  return `https://ensemble-api.open-meteo.com/v1/ensemble?${q}`
}

/** Series for one model+variable; Open-Meteo suffixes keys per model. */
export function modelSeries(
  data: HourlyByModel,
  varKey: string,
  modelKey: string,
): Array<number | null> | null {
  return data.hourly[`${varKey}_${modelKey}`] ?? null
}

/** All ensemble member series for a variable (member01, member02, …). */
export function ensembleMembers(data: HourlyByModel, varKey: string): Array<Array<number | null>> {
  const out: Array<Array<number | null>> = []
  for (const key of Object.keys(data.hourly)) {
    if (key.startsWith(`${varKey}_member`)) out.push(data.hourly[key])
  }
  return out
}
