import { describe, expect, it } from 'vitest'
import { airQualityAt, aqiCategory, type AirQualityResponse } from '@/core/data/openMeteo/airQuality'

describe('aqiCategory', () => {
  it('maps EPA breakpoints', () => {
    expect(aqiCategory(42)).toBe('Good')
    expect(aqiCategory(51)).toBe('Moderate')
    expect(aqiCategory(150)).toBe('Unhealthy for sensitive groups')
    expect(aqiCategory(999)).toBe('Hazardous')
  })
})

describe('airQualityAt', () => {
  const res: AirQualityResponse = {
    hourly: {
      time: ['2026-08-15T00:00', '2026-08-15T01:00', '2026-08-15T02:00'],
      us_aqi: [40, null, 55],
      pm2_5: [8.1, null, 12.0],
    },
  }

  it('picks the nearest hour with a reading', () => {
    const at = airQualityAt(res, Date.parse('2026-08-15T00:20:00Z'))
    expect(at?.usAqi).toBe(40)
    expect(at?.pm25).toBe(8.1)
  })

  it('skips null hours rather than returning nothing', () => {
    // 01:10 is nearest to the null 01Z reading; 02Z should win instead.
    const at = airQualityAt(res, Date.parse('2026-08-15T01:10:00Z'))
    expect(at?.usAqi).toBe(55)
  })

  it('returns null when no hour has a reading', () => {
    const empty: AirQualityResponse = {
      hourly: { time: ['2026-08-15T00:00'], us_aqi: [null], pm2_5: [null] },
    }
    expect(airQualityAt(empty, Date.parse('2026-08-15T00:00:00Z'))).toBeNull()
  })
})
