import { describe, expect, it } from 'vitest'
import {
  fhourStr,
  previousCycle,
  resolveForecast,
  runFromMs,
  runStartMs,
  snapHour,
} from './gfsValid.mjs'

const LATEST = { ymd: '20260906', cycle: 6 }
const LATEST_MS = Date.UTC(2026, 8, 6, 6)
const H = 3600_000

describe('run time round-trip', () => {
  it('converts a run to its start and back', () => {
    expect(runStartMs(LATEST)).toBe(LATEST_MS)
    expect(runFromMs(LATEST_MS)).toEqual(LATEST)
  })
})

describe('snapHour', () => {
  it('is hourly to 120 and three-hourly beyond, clamped to 384', () => {
    expect(snapHour(17.4)).toBe(17)
    expect(snapHour(120)).toBe(120)
    expect(snapHour(121)).toBe(120)
    expect(snapHour(122)).toBe(123)
    expect(snapHour(200)).toBe(201)
    expect(snapHour(900)).toBe(384)
    expect(snapHour(-3)).toBe(0)
  })
})

describe('resolveForecast', () => {
  it('uses the latest run for future valid times', () => {
    expect(resolveForecast(LATEST_MS + 18 * H, LATEST)).toEqual({ run: LATEST, fhour: 18 })
    expect(resolveForecast(LATEST_MS + 130 * H, LATEST).fhour).toBe(129)
  })

  it('walks back through earlier cycles for past valid times', () => {
    // 04:30Z the day before → the 00z cycle, f004 (rounded).
    const r = resolveForecast(Date.UTC(2026, 8, 5, 4, 30), LATEST)
    expect(r).toEqual({ run: { ymd: '20260905', cycle: 0 }, fhour: 5 })
  })

  it("a valid time at the latest run start is that run's analysis", () => {
    expect(resolveForecast(LATEST_MS, LATEST)).toEqual({ run: LATEST, fhour: 0 })
  })
})

describe('previousCycle', () => {
  it('keeps the valid time by stepping the run back six hours and the hour forward', () => {
    expect(previousCycle({ run: LATEST, fhour: 380 })).toEqual({
      run: { ymd: '20260906', cycle: 0 },
      fhour: 384,
    })
    expect(previousCycle({ run: { ymd: '20260906', cycle: 0 }, fhour: 2 })).toEqual({
      run: { ymd: '20260905', cycle: 18 },
      fhour: 8,
    })
  })
})

describe('fhourStr', () => {
  it('pads to three digits', () => {
    expect(fhourStr(3)).toBe('003')
    expect(fhourStr(384)).toBe('384')
  })
})
