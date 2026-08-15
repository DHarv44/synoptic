import { describe, expect, it } from 'vitest'
import { alertCategory, alertWeight, alertBbox, CATEGORY_SETTING } from '@/core/data/nws/alerts'
import type { AlertFeature } from '@/core/data/nws/alerts'

describe('alertCategory', () => {
  it('files the convective products that must never be hideable', () => {
    expect(alertCategory('Tornado Warning')).toBe('convective')
    expect(alertCategory('Severe Thunderstorm Warning')).toBe('convective')
    expect(alertCategory('Extreme Wind Warning')).toBe('convective')
    // Which is the point of the null entry — no setting can suppress them.
    expect(CATEGORY_SETTING.convective).toBeNull()
  })

  it('keeps tropical products out of the marine bucket', () => {
    // "Tropical Storm Warning" contains neither Marine nor Gale, but it is
    // checked before the marine rules on purpose — muting marine must not
    // mute a hurricane.
    expect(alertCategory('Tropical Storm Warning')).toBe('tropical')
    expect(alertCategory('Hurricane Warning')).toBe('tropical')
    expect(alertCategory('Storm Surge Warning')).toBe('tropical')
    // ...but Hurricane Force Wind Warning is a marine bulletin.
    expect(alertCategory('Hurricane Force Wind Warning')).toBe('marine')
  })

  it('treats coastal products as marine rather than flood', () => {
    expect(alertCategory('Coastal Flood Advisory')).toBe('marine')
    expect(alertCategory('Small Craft Advisory')).toBe('marine')
    expect(alertCategory('Rip Current Statement')).toBe('marine')
    expect(alertCategory('Beach Hazards Statement')).toBe('marine')
    // A river/flash flood is not coastal.
    expect(alertCategory('Flash Flood Warning')).toBe('flood')
    expect(alertCategory('Flood Watch')).toBe('flood')
  })

  it('covers winter, heat and the long tail', () => {
    expect(alertCategory('Winter Storm Warning')).toBe('winter')
    expect(alertCategory('Blizzard Warning')).toBe('winter')
    expect(alertCategory('Freeze Warning')).toBe('winter')
    expect(alertCategory('Wind Chill Advisory')).toBe('winter')
    expect(alertCategory('Excessive Heat Warning')).toBe('heat')
    expect(alertCategory('Air Quality Alert')).toBe('other')
    expect(alertCategory('Special Weather Statement')).toBe('other')
  })

  it('gives every category a setting key except convective', () => {
    for (const [category, key] of Object.entries(CATEGORY_SETTING)) {
      if (category === 'convective') expect(key).toBeNull()
      else expect(typeof key).toBe('string')
    }
  })
})

describe('alertWeight', () => {
  it('gives tornado warnings the most ink', () => {
    expect(alertWeight('Tornado Warning')).toBeGreaterThan(alertWeight('Severe Thunderstorm Warning'))
    expect(alertWeight('Severe Thunderstorm Warning')).toBeGreaterThan(alertWeight('Frost Advisory'))
  })
})

describe('alertBbox', () => {
  const alert = (coords: number[][][] | null): AlertFeature => ({
    id: 'x',
    geometry: coords ? { type: 'Polygon', coordinates: coords } : null,
    properties: { event: 'Test', severity: 'Severe', areaDesc: '', expires: '' },
  })

  it('spans every ring', () => {
    expect(
      alertBbox(alert([[[-100, 30], [-90, 30], [-90, 40], [-100, 40], [-100, 30]]])),
    ).toEqual([-100, 30, -90, 40])
  })

  it('is null without a polygon', () => {
    expect(alertBbox(alert(null))).toBeNull()
  })
})
