import { beforeEach, describe, expect, it } from 'vitest'
import { PLUME_MAX_AGE_MS, plumeTrend, usePlumeHistory } from '@/features/volcanoes/plumeHistory'
import { plumeTopFl, type VolcanicAshAdvisory } from '@/features/volcanoes/vaa'

const NOW = Date.parse('2026-09-05T12:00:00Z')

function advisory(over: Partial<VolcanicAshAdvisory>): VolcanicAshAdvisory {
  return {
    vaac: 'DARWIN',
    volcanoName: 'KRAKATAU',
    volcanoNumber: 262000,
    position: { lat: -6.1, lon: 105.4 },
    issuedMs: NOW,
    eruptionDetails: '',
    remarks: '',
    timesteps: [],
    topFl: 300,
    raw: '',
    ...over,
  }
}

beforeEach(() => {
  usePlumeHistory.setState({ series: {} })
})

describe('plumeTopFl', () => {
  const poly = (levels: string) => ({ levels, points: [], movement: null })

  it('takes the eruption-details top', () => {
    expect(plumeTopFl('VA TO FL500 MOV W, VA TO FL200 MOV TO E', [])).toBe(500)
  })

  it('takes the highest observed band when details say nothing', () => {
    expect(
      plumeTopFl('', [{ step: 'OBS', polygons: [poly('SFC/FL200'), poly('FL200/FL350')] }]),
    ).toBe(350)
  })

  it('prefers whichever is higher and ignores forecast bands', () => {
    const steps = [
      { step: 'OBS', polygons: [poly('SFC/FL250')] },
      { step: '+6', polygons: [poly('SFC/FL550')] },
    ]
    expect(plumeTopFl('VA TO FL300', steps)).toBe(300)
    expect(plumeTopFl('', steps)).toBe(250)
  })

  it('is null when nothing states a level', () => {
    expect(plumeTopFl('CONTINUOUS VA EMISSION', [])).toBeNull()
  })
})

describe('plume history', () => {
  const record = (a: VolcanicAshAdvisory[], now = NOW) => usePlumeHistory.getState().record(a, now)
  const series = () => usePlumeHistory.getState().series['262000'] ?? []

  it('adds one point per advisory issue time, oldest first', () => {
    record([advisory({ issuedMs: NOW, topFl: 300 })])
    record([advisory({ issuedMs: NOW - 3600_000, topFl: 200 })])
    expect(series()).toEqual([
      { t: NOW - 3600_000, fl: 200 },
      { t: NOW, fl: 300 },
    ])
  })

  it('does not duplicate a re-polled advisory', () => {
    record([advisory({})])
    record([advisory({})])
    expect(series()).toHaveLength(1)
  })

  it('skips advisories without a number, time or level', () => {
    record([
      advisory({ volcanoNumber: null }),
      advisory({ issuedMs: null }),
      advisory({ topFl: null }),
    ])
    expect(usePlumeHistory.getState().series).toEqual({})
  })

  it('forgets points older than the horizon', () => {
    record([advisory({ issuedMs: NOW - PLUME_MAX_AGE_MS - 1, topFl: 100 })], NOW - 1000)
    expect(series()).toHaveLength(1)
    record([advisory({ issuedMs: NOW, topFl: 300 })], NOW)
    expect(series()).toEqual([{ t: NOW, fl: 300 }])
  })

  it('trend compares the latest with the previous point', () => {
    expect(plumeTrend([])).toBeNull()
    expect(plumeTrend([{ t: 1, fl: 200 }])?.delta).toBe(0)
    const tr = plumeTrend([
      { t: 1, fl: 200 },
      { t: 2, fl: 500 },
    ])
    expect(tr?.latest.fl).toBe(500)
    expect(tr?.delta).toBe(300)
  })
})
