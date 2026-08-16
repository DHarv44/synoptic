import { describe, expect, it } from 'vitest'
import {
  SYNOPTIC_MS,
  nearestStation,
  raobUrl,
  synopticTimeMs,
  toSounding,
  type RaobResponse,
} from '@/core/data/iem/raob'

const T12Z = Date.parse('2026-08-15T12:00:00Z')

describe('synopticTimeMs', () => {
  it('floors to the previous 00Z/12Z', () => {
    const now = Date.parse('2026-08-15T18:00:00Z')
    expect(synopticTimeMs(Date.parse('2026-08-15T15:30:00Z'), now)).toBe(T12Z)
  })
  it('holds back by the archive lag near launch time', () => {
    // 13Z: the 12Z balloon is still in the air; serve 00Z.
    const now = Date.parse('2026-08-15T13:00:00Z')
    expect(synopticTimeMs(now, now)).toBe(T12Z - SYNOPTIC_MS)
  })
  it('follows simTime into the past for historic scrubbing', () => {
    const now = Date.parse('2026-08-15T18:00:00Z')
    expect(synopticTimeMs(Date.parse('2026-08-14T03:00:00Z'), now)).toBe(
      Date.parse('2026-08-14T00:00:00Z'),
    )
  })
})

describe('raobUrl', () => {
  it('formats ts as YYYYMMDDHHMM', () => {
    expect(raobUrl(T12Z, 'KOUN')).toContain('ts=202608151200&station=KOUN')
  })
})

describe('nearestStation', () => {
  it('picks the closest station by great-circle distance', () => {
    const stations = [
      { id: 'KOUN', lat: 35.22, lon: -97.4 },
      { id: 'KFWD', lat: 32.8, lon: -97.3 },
    ]
    const near = nearestStation(stations, 35.0, -97.5)
    expect(near?.station.id).toBe('KOUN')
    expect(near?.distanceKm).toBeGreaterThan(20)
    expect(near?.distanceKm).toBeLessThan(30)
  })
  it('returns null for an empty list', () => {
    expect(nearestStation([], 35, -97)).toBeNull()
  })
})

function level(partial: Partial<RaobResponse['profiles'][0]['profile'][0]>) {
  return { pres: null, hght: null, tmpc: null, dwpc: null, drct: null, sknt: null, ...partial }
}

describe('toSounding', () => {
  const res: RaobResponse = {
    profiles: [
      {
        station: 'KOUN',
        valid: '2026-08-15T12:00:00Z',
        profile: [
          // below-ground mandatory level: height only, no thermo — dropped
          level({ pres: 1000, hght: 145 }),
          level({ pres: 978, hght: 357, tmpc: 24.8, dwpc: 20.3, drct: 180, sknt: 10 }),
          // thermo-only significant level: wind must be interpolated
          level({ pres: 950, hght: 600, tmpc: 23.0, dwpc: 19.0 }),
          level({ pres: 925, hght: 803, tmpc: 21.0, dwpc: 18.0, drct: 180, sknt: 20 }),
          level({ pres: 850, hght: 1500, tmpc: 16.0, dwpc: 12.0, drct: 200, sknt: 30 }),
          level({ pres: 700, hght: 3100, tmpc: 8.0, dwpc: 2.0, drct: 220, sknt: 40 }),
          level({ pres: 500, hght: 5800, tmpc: -8.0, dwpc: -20.0, drct: 240, sknt: 50 }),
        ],
      },
    ],
  }

  it('keeps only full thermodynamic levels', () => {
    const s = toSounding(res)
    expect(s?.levels.map((l) => l.p)).toEqual([978, 950, 925, 850, 700, 500])
    expect(s?.timeMs).toBe(T12Z)
  })

  it('converts knots to m/s on reported wind levels', () => {
    const s = toSounding(res)
    const surface = s?.levels[0]
    expect(surface?.ws).toBeCloseTo(10 * 0.514444, 3)
    expect(surface?.wd).toBeCloseTo(180, 1)
  })

  it('interpolates wind at thermo-only levels', () => {
    const s = toSounding(res)
    const mid = s?.levels.find((l) => l.p === 950)
    // Between 10 kt and 20 kt, both from 180°: direction holds, speed between.
    expect(mid?.wd).toBeCloseTo(180, 1)
    expect(mid?.ws).toBeGreaterThan(10 * 0.514444)
    expect(mid?.ws).toBeLessThan(20 * 0.514444)
  })

  it('rejects profiles with too few levels or no profile at all', () => {
    expect(toSounding({ profiles: [] })).toBeNull()
    const thin: RaobResponse = {
      profiles: [
        {
          station: 'KOUN',
          valid: '2026-08-15T12:00:00Z',
          profile: [level({ pres: 978, hght: 357, tmpc: 24.8, dwpc: 20.3 })],
        },
      ],
    }
    expect(toSounding(thin)).toBeNull()
  })
})
