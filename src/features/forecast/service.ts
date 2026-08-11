import type { OpenMeteoForecast } from '@/core/data/openMeteo/types'

export interface HourRow {
  timeMs: number
  tempC: number
  precipProb: number
  precipMm: number
  code: number
}

export interface DayRow {
  /** UTC date key, e.g. 2026-08-11. */
  date: string
  highC: number
  lowC: number
  precipProb: number
  precipMm: number
  gustMs: number
  code: number
}

/**
 * The next `count` hours from `nowMs`. Open-Meteo returns whole days from
 * midnight UTC, so the run always starts in the past — find where now is
 * and take the window forward from there.
 */
export function hourlySlice(f: OpenMeteoForecast, nowMs: number, count: number): HourRow[] {
  const h = f.hourly
  const rows: HourRow[] = []
  for (let i = 0; i < h.time.length && rows.length < count; i++) {
    const timeMs = Date.parse(h.time[i] + 'Z')
    // Keep the hour we're inside, not just the ones ahead of it.
    if (timeMs + 3600_000 <= nowMs) continue
    rows.push({
      timeMs,
      tempC: h.temperature_2m[i],
      precipProb: h.precipitation_probability[i] ?? 0,
      precipMm: h.precipitation[i] ?? 0,
      code: h.weather_code[i],
    })
  }
  return rows
}

/** Daily outlook rows, or empty when the response carries no daily block. */
export function dailyRows(f: OpenMeteoForecast, count: number): DayRow[] {
  const d = f.daily
  if (!d) return []
  const rows: DayRow[] = []
  for (let i = 0; i < d.time.length && rows.length < count; i++) {
    rows.push({
      date: d.time[i],
      highC: d.temperature_2m_max[i],
      lowC: d.temperature_2m_min[i],
      precipProb: d.precipitation_probability_max[i] ?? 0,
      precipMm: d.precipitation_sum[i] ?? 0,
      gustMs: d.wind_gusts_10m_max[i] ?? 0,
      code: d.weather_code[i],
    })
  }
  return rows
}

/** "Today" / "Wed" — UTC, matching the buckets the API returns. */
export function dayLabel(date: string, nowMs: number): string {
  const todayUtc = new Date(nowMs).toISOString().slice(0, 10)
  if (date === todayUtc) return 'Today'
  return new Date(date + 'T00:00:00Z').toLocaleDateString([], {
    weekday: 'short',
    timeZone: 'UTC',
  })
}
