import { describe, expect, it } from 'vitest'
import { dailyRows, dayLabel, hourlySlice } from '@/features/forecast/service'
import type { OpenMeteoForecast } from '@/core/data/openMeteo/types'

/** Open-Meteo returns whole UTC days, so a run always starts before "now". */
function forecast(): OpenMeteoForecast {
  const hours = Array.from({ length: 48 }, (_, i) => {
    const h = String(i % 24).padStart(2, '0')
    const day = i < 24 ? '11' : '12'
    return `2026-08-${day}T${h}:00`
  })
  return {
    latitude: 35,
    longitude: -97,
    current: {} as OpenMeteoForecast['current'],
    hourly: {
      time: hours,
      temperature_2m: hours.map((_, i) => 20 + i),
      dew_point_2m: hours.map(() => 10),
      precipitation: hours.map(() => 0),
      precipitation_probability: hours.map(() => 5),
      wind_speed_10m: hours.map(() => 3),
      wind_direction_10m: hours.map(() => 180),
      cloud_cover: hours.map(() => 0),
      pressure_msl: hours.map(() => 1012),
      weather_code: hours.map(() => 0),
    },
    daily: {
      time: ['2026-08-11', '2026-08-12', '2026-08-13'],
      weather_code: [0, 3, 95],
      temperature_2m_max: [38, 39, 40],
      temperature_2m_min: [26, 27, 28],
      precipitation_sum: [0, 1.5, 12],
      precipitation_probability_max: [0, null, 70],
      wind_speed_10m_max: [5, 6, 9],
      wind_gusts_10m_max: [12, 14, 22],
    },
  }
}

describe('hourlySlice', () => {
  const now = Date.parse('2026-08-11T10:30:00Z')

  it('starts at the hour currently in progress, not the next one', () => {
    // 10:30 sits inside the 10:00 bucket — that hour is still the forecast
    // for right now, so dropping it would skip the most relevant row.
    const rows = hourlySlice(forecast(), now, 3)
    expect(rows.map((r) => new Date(r.timeMs).toISOString())).toEqual([
      '2026-08-11T10:00:00.000Z',
      '2026-08-11T11:00:00.000Z',
      '2026-08-11T12:00:00.000Z',
    ])
  })

  it('parses times as UTC, not local', () => {
    const [first] = hourlySlice(forecast(), now, 1)
    expect(new Date(first.timeMs).getUTCHours()).toBe(10)
  })

  it('honours the count and runs past midnight into the next day', () => {
    const rows = hourlySlice(forecast(), now, 24)
    expect(rows).toHaveLength(24)
    expect(new Date(rows[23].timeMs).toISOString()).toBe('2026-08-12T09:00:00.000Z')
  })

  it('returns nothing when the whole run is in the past', () => {
    expect(hourlySlice(forecast(), Date.parse('2026-09-01T00:00:00Z'), 24)).toEqual([])
  })
})

describe('dailyRows', () => {
  it('caps at the requested count and defaults a null probability', () => {
    const rows = dailyRows(forecast(), 2)
    expect(rows).toHaveLength(2)
    expect(rows[1].precipProb).toBe(0)
    expect(rows[1].highC).toBe(39)
  })

  it('is empty when the response has no daily block', () => {
    const f = forecast()
    delete f.daily
    expect(dailyRows(f, 5)).toEqual([])
  })
})

describe('dayLabel', () => {
  const now = Date.parse('2026-08-11T23:50:00Z')

  it('names the current UTC day "Today"', () => {
    expect(dayLabel('2026-08-11', now)).toBe('Today')
  })

  it('uses UTC weekdays so labels match the buckets', () => {
    // 2026-08-12 is a Wednesday; a local-time parse could slip a day.
    expect(dayLabel('2026-08-12', now)).toBe('Wed')
  })
})
