import type { PrecipUnit, PressureUnit, TempUnit, WindUnit } from '@/core/units/useUnitSystem'

/**
 * The single source for unit conversion + display (PLAN.md §4.2).
 * All inputs are SI-ish: °C, m/s, hPa, mm. Callers pass the unit they want
 * rather than a system, so wind can read in knots while distances stay
 * metric — the way professional tools work.
 */

export function fmtTemp(celsius: number, unit: TempUnit): string {
  if (unit === 'F') return `${Math.round((celsius * 9) / 5 + 32)}°F`
  return `${Math.round(celsius)}°C`
}

const WIND_PER_MS: Record<WindUnit, { factor: number; label: string; decimals: number }> = {
  ms: { factor: 1, label: 'm/s', decimals: 1 },
  kmh: { factor: 3.6, label: 'km/h', decimals: 0 },
  mph: { factor: 2.23694, label: 'mph', decimals: 0 },
  kt: { factor: 1.94384, label: 'kt', decimals: 0 },
}

export function fmtWind(ms: number, unit: WindUnit): string {
  const u = WIND_PER_MS[unit]
  return `${(ms * u.factor).toFixed(u.decimals)} ${u.label}`
}

export function fmtPressure(hPa: number, unit: PressureUnit): string {
  if (unit === 'inHg') return `${(hPa * 0.02952998).toFixed(2)} inHg`
  return `${hPa.toFixed(1)} hPa`
}

export function fmtPrecip(mm: number, unit: PrecipUnit): string {
  if (unit === 'in') return `${(mm / 25.4).toFixed(2)} in`
  return `${mm.toFixed(1)} mm`
}

export function fmtPercent(pct: number): string {
  return `${Math.round(pct)}%`
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']

export function fmtWindDir(deg: number): string {
  return COMPASS[Math.round(deg / 22.5) % 16]
}

export function fmtLatLon(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(2)}°${ns} ${Math.abs(lon).toFixed(2)}°${ew}`
}
