import { describe, expect, it } from 'vitest'
import { characterize, type VerdictPart } from '@/features/forecast/characterize'
import type { OpenMeteoForecast } from '@/core/data/openMeteo/types'

const NOW = Date.parse('2026-08-11T12:00:00Z')

interface Hour {
  code?: number
  prob?: number
  mm?: number
  temp?: number
}

interface Day {
  high?: number
  low?: number
  prob?: number
  gust?: number
  code?: number
}

/** A forecast whose hours start at NOW; everything unspecified is benign. */
function forecast(hours: Hour[], days: Day[] = []): OpenMeteoForecast {
  const time = hours.map((_, i) => new Date(NOW + i * 3600_000).toISOString().slice(0, 16))
  return {
    hourly: {
      time,
      temperature_2m: hours.map((h) => h.temp ?? 20),
      precipitation: hours.map((h) => h.mm ?? 0),
      precipitation_probability: hours.map((h) => h.prob ?? 0),
      weather_code: hours.map((h) => h.code ?? 1),
    },
    daily: {
      time: days.map((_, i) => new Date(NOW + i * 86_400_000).toISOString().slice(0, 10)),
      temperature_2m_max: days.map((d) => d.high ?? 25),
      temperature_2m_min: days.map((d) => d.low ?? 15),
      precipitation_probability_max: days.map((d) => d.prob ?? 0),
      precipitation_sum: days.map(() => 0),
      wind_gusts_10m_max: days.map((d) => d.gust ?? 5),
      weather_code: days.map((d) => d.code ?? 1),
    },
  } as unknown as OpenMeteoForecast
}

/** Render tokens as readable stand-ins so assertions read like the line. */
function text(parts: VerdictPart[] | null): string {
  if (!parts) return ''
  return parts
    .map((p) => {
      if (typeof p === 'string') return p
      if ('timeMs' in p) return `T${(p.timeMs - NOW) / 3600_000}`
      return `G${p.gustMs}`
    })
    .join('')
}

const dry = (n: number): Hour[] => Array.from({ length: n }, () => ({}))

describe('characterize', () => {
  it('says dry when nothing is coming', () => {
    expect(text(characterize(forecast(dry(18), [{}, {}]), NOW))).toBe('Dry through tomorrow')
  })

  it('names the onset hour when rain arrives later', () => {
    const hours = [...dry(5), { code: 61, prob: 70 }, ...dry(12)]
    expect(text(characterize(forecast(hours, [{}, {}]), NOW))).toBe('Rain from ~T5')
  })

  it('says when rain falling now will stop — a real gap, not one dry hour', () => {
    const hours = [
      { code: 63, prob: 90, mm: 2 },
      { code: 63, prob: 80, mm: 1 },
      {}, // single dry hour inside a wet spell must not read as the end
      { code: 61, prob: 60, mm: 0.5 },
      ...dry(14),
    ]
    expect(text(characterize(forecast(hours, [{}, {}]), NOW))).toBe('Rain until ~T4')
  })

  it('calls a wet spell with no end in the window continuing', () => {
    const hours = Array.from({ length: 18 }, () => ({ code: 63, prob: 80, mm: 1 }))
    expect(text(characterize(forecast(hours, [{}, {}]), NOW))).toBe('Rain continuing')
  })

  it('names the most severe kind in the spell, not the first', () => {
    const hours = [
      { code: 61, prob: 70, mm: 1 },
      { code: 95, prob: 80, mm: 3 },
      ...dry(16),
    ]
    expect(text(characterize(forecast(hours, [{}, {}]), NOW))).toMatch(/^Storms until/)
  })

  it('flags storms as the second clause when the main story is plain rain', () => {
    const hours = [
      { code: 61, prob: 70, mm: 1 },
      ...dry(7),
      { code: 95, prob: 40 }, // storm code but under the wet threshold
      ...dry(9),
    ]
    expect(text(characterize(forecast(hours, [{}, {}]), NOW))).toBe(
      'Rain until ~T1 · storms possible ~T8',
    )
  })

  it('surfaces notable gusts', () => {
    const out = text(characterize(forecast(dry(18), [{ gust: 22 }, {}]), NOW))
    expect(out).toBe('Dry through tomorrow · gusts to G22')
  })

  it('surfaces a big temperature swing, cooler and warmer', () => {
    expect(text(characterize(forecast(dry(18), [{ high: 30 }, { high: 20 }]), NOW))).toBe(
      'Dry through tomorrow · much cooler tomorrow',
    )
    expect(text(characterize(forecast(dry(18), [{ high: 20 }, { high: 30 }]), NOW))).toBe(
      'Dry through tomorrow · much warmer tomorrow',
    )
  })

  it('reads tomorrow from the daily block when the hourly window is dry', () => {
    expect(
      text(characterize(forecast(dry(18), [{}, { prob: 80, code: 71 }]), NOW)),
    ).toBe('Dry today · snow tomorrow')
  })

  it('prefers one second clause: storms outrank wind', () => {
    const hours = [{ code: 61, prob: 70, mm: 1 }, ...dry(7), { code: 95 }, ...dry(9)]
    const out = text(characterize(forecast(hours, [{ gust: 25 }, {}]), NOW))
    expect(out).toContain('storms')
    expect(out).not.toContain('gusts')
  })

  it('returns null with no hourly data', () => {
    expect(characterize(forecast([]), NOW)).toBeNull()
  })
})
