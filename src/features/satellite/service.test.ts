import { describe, expect, it } from 'vitest'
import { gibsTime, gibsTileTemplate } from '@/features/satellite/service'

const NOW = Date.parse('2026-08-15T20:57:23Z')

describe('gibsTime', () => {
  it('gives daily products a plain date, clamped to yesterday', () => {
    expect(gibsTime('truecolor', NOW, NOW)).toBe('2026-08-14')
  })

  it('snaps sub-daily products to their 10-minute cadence', () => {
    // now − 75 min lag = 19:42:23 → snapped down to 19:40.
    expect(gibsTime('geocolor', NOW, NOW)).toBe('2026-08-15T19:40:00Z')
  })

  it('follows the timeline into the past without the lag clamp', () => {
    expect(gibsTime('geocolor', Date.parse('2026-08-15T14:03:00Z'), NOW)).toBe(
      '2026-08-15T14:00:00Z',
    )
  })

  it('never names a frame newer than the product can have published', () => {
    // Sim time in the future still clamps behind now by the lag.
    expect(gibsTime('goes-ir', NOW + 3_600_000, NOW) <= '2026-08-15T19:57:23Z').toBe(true)
  })

  it('holds a stable URL between frames, so the source is not thrashed', () => {
    const a = gibsTime('airmass', Date.parse('2026-08-15T14:01:00Z'), NOW)
    const b = gibsTime('airmass', Date.parse('2026-08-15T14:09:00Z'), NOW)
    expect(a).toBe(b)
  })
})

describe('gibsTileTemplate', () => {
  it('builds the z/y/x path GIBS expects', () => {
    const url = gibsTileTemplate('geocolor', '2026-08-15T19:50:00Z')
    expect(url).toContain('GOES-East_ABI_GeoColor/default/2026-08-15T19:50:00Z/')
    expect(url).toContain('/{z}/{y}/{x}.png')
    expect(url).toContain('GoogleMapsCompatible_Level7')
  })

  it('falls back to truecolor for an unknown key', () => {
    expect(gibsTileTemplate('nope', '2026-08-14')).toContain('VIIRS_SNPP')
  })
})
