import { describe, expect, it } from 'vitest'
import { buoyColor, marineBuoys, waveLabel, type Buoy } from '@/features/buoys/service'

const NOW = Date.parse('2026-08-15T23:00:00Z')

function buoy(partial: Partial<Buoy>): Buoy {
  return {
    id: 'X',
    lat: 30,
    lon: -75,
    timeMs: NOW - 10 * 60_000,
    wdir: null,
    wspd: null,
    gst: null,
    wvht: null,
    dpd: null,
    pres: null,
    atmp: null,
    wtmp: null,
    ...partial,
  }
}

describe('marineBuoys', () => {
  it('keeps fresh stations reporting waves or water temperature', () => {
    const kept = marineBuoys(
      [
        buoy({ id: 'waves', wvht: 1.2 }),
        buoy({ id: 'water', wtmp: 22 }),
        buoy({ id: 'landish', pres: 1015 }), // met-only station: not marine
        buoy({ id: 'stale', wvht: 3, timeMs: NOW - 4 * 3_600_000 }),
      ],
      NOW,
    )
    expect(kept.map((b) => b.id)).toEqual(['waves', 'water'])
  })
})

describe('buoyColor', () => {
  it('bins by wave height, treating no-wave stations as calm', () => {
    expect(buoyColor(null)).toBe(buoyColor(0.1))
    expect(buoyColor(0.1)).not.toBe(buoyColor(2))
    expect(buoyColor(2)).not.toBe(buoyColor(5))
  })
})

describe('waveLabel', () => {
  it('formats per unit system', () => {
    expect(waveLabel(1.5, 'metric')).toBe('1.5 m')
    expect(waveLabel(1.5, 'imperial')).toBe('5 ft')
  })
})
