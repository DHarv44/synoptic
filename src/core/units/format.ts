import type { TempUnit, UnitSystem } from '@/core/units/useUnitSystem'

/**
 * The single source for unit conversion + display (PLAN.md §4.2).
 * All inputs are SI-ish: °C, m/s, hPa, mm.
 */

export function fmtTemp(celsius: number, unit: TempUnit): string {
  if (unit === 'F') return `${Math.round((celsius * 9) / 5 + 32)}°F`
  return `${Math.round(celsius)}°C`
}

export function fmtWind(ms: number, system: UnitSystem): string {
  if (system === 'imperial') return `${Math.round(ms * 2.23694)} mph`
  return `${Math.round(ms * 3.6)} km/h`
}

export function fmtPressure(hPa: number): string {
  return `${hPa.toFixed(1)} hPa`
}

export function fmtPrecip(mm: number, system: UnitSystem): string {
  if (system === 'imperial') return `${(mm / 25.4).toFixed(2)} in`
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
