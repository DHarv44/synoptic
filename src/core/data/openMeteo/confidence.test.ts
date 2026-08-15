import { describe, expect, it } from 'vitest'
import { temperatureAgreement } from '@/core/data/openMeteo/confidence'
import type { HourlyByModel } from '@/core/data/openMeteo/models'

const NOW = Date.parse('2026-08-11T06:00:00Z')

/**
 * A models response with one temperature per model per day, held constant
 * across that day's 24 hours — spread control without hourly bookkeeping.
 */
function models(perDay: number[][]): HourlyByModel {
  const keys = ['gfs_seamless', 'ecmwf_ifs025', 'icon_seamless', 'gem_seamless', 'ukmo_seamless']
  const time: string[] = []
  const series: Record<string, Array<number | null>> = {}
  for (const k of keys) series[`temperature_2m_${k}`] = []
  perDay.forEach((temps, day) => {
    for (let h = 0; h < 24; h++) {
      time.push(new Date(NOW - 6 * 3600_000 + day * 86_400_000 + h * 3600_000).toISOString().slice(0, 16))
      keys.forEach((k, m) => series[`temperature_2m_${k}`].push(temps[m] ?? null))
    }
  })
  return { hourly: { time, ...series } } as HourlyByModel
}

const tight = [20, 21, 20.5, 19.5, 20]
const wide = [16, 24, 20, 27, 14]

describe('temperatureAgreement', () => {
  it('reports agreement through the whole run when spread stays small', () => {
    const a = temperatureAgreement(models([tight, tight, tight]), NOW)
    expect(a).toEqual({ throughDate: '2026-08-13', divergesOn: null })
  })

  it('finds the first day the models stop telling the same story', () => {
    const a = temperatureAgreement(models([tight, tight, wide]), NOW)
    expect(a).toEqual({ throughDate: '2026-08-12', divergesOn: '2026-08-13' })
  })

  it('reports immediate divergence as diverging on the first day', () => {
    const a = temperatureAgreement(models([wide, wide]), NOW)
    expect(a?.divergesOn).toBe('2026-08-11')
    expect(a?.throughDate).toBe('2026-08-11')
  })

  it('ignores days already behind us', () => {
    // Day 0 of the response is yesterday relative to a later "now".
    const later = NOW + 86_400_000
    const a = temperatureAgreement(models([wide, tight, tight]), later)
    expect(a).toEqual({ throughDate: '2026-08-13', divergesOn: null })
  })

  it('declines to judge with fewer than three models reporting', () => {
    const twoModels = models([[20, 21], [20, 21]])
    expect(temperatureAgreement(twoModels, NOW)).toBeNull()
  })

  it('handles an empty response', () => {
    expect(temperatureAgreement({ hourly: { time: [] } } as unknown as HourlyByModel, NOW)).toBeNull()
  })
})
