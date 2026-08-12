import { describe, expect, it } from 'vitest'
import { n0qDbz, n0qIndexByRgb } from '@/features/radar/mosaic/n0qPalette'
import { buildTranslation, recolor } from '@/features/radar/mosaic/recolor'
import { reflectivityLut } from '@/features/radar/level2/colormap'

/** Colours lifted from a live mosaic tile, with the index each resolved to. */
const SAMPLES = {
  green: { rgb: [9, 115, 12], index: 129, dbz: 32.5 },
  olive: { rgb: [152, 168, 6], index: 140, dbz: 38 },
  cyan: { rgb: [111, 214, 232], index: 100, dbz: 18 },
  red: { rgb: [241, 0, 0], index: 166, dbz: 51 },
} as const

const packed = (rgb: readonly number[]): number => (rgb[0] << 16) | (rgb[1] << 8) | rgb[2]

describe('n0q palette', () => {
  it('resolves real tile colours to their palette index', () => {
    const byRgb = n0qIndexByRgb()
    for (const [name, s] of Object.entries(SAMPLES)) {
      expect({ name, index: byRgb.get(packed(s.rgb)) }).toEqual({ name, index: s.index })
    }
  })

  it('reads the index as a dBZ value', () => {
    for (const s of Object.values(SAMPLES)) expect(n0qDbz(s.index)).toBe(s.dbz)
  })

  it('covers the whole 256-level ramp', () => {
    // Duplicates exist at the top of the ramp, so this is a floor not an equality.
    expect(n0qIndexByRgb().size).toBeGreaterThan(240)
  })
})

describe('buildTranslation', () => {
  it('maps a source colour to our colour for the same reading', () => {
    const lut = reflectivityLut(0)
    const t = buildTranslation(0)
    const o = SAMPLES.olive.index * 4
    const word = t.get(packed(SAMPLES.olive.rgb))!
    expect([word & 0xff, (word >>> 8) & 0xff, (word >>> 16) & 0xff, word >>> 24]).toEqual([
      lut[o],
      lut[o + 1],
      lut[o + 2],
      lut[o + 3],
    ])
  })

  it('drops readings under the floor and keeps those above it', () => {
    const t = buildTranslation(20)
    expect(t.get(packed(SAMPLES.cyan.rgb))).toBe(0) // 18 dBZ, under
    expect(t.get(packed(SAMPLES.green.rgb))).not.toBe(0) // 32.5 dBZ, over
  })

  it('moves the cut when the floor moves', () => {
    expect(buildTranslation(15).get(packed(SAMPLES.cyan.rgb))).not.toBe(0)
    expect(buildTranslation(40).get(packed(SAMPLES.green.rgb))).toBe(0)
  })
})

describe('recolor', () => {
  function tile(pixels: Array<readonly number[]>): Uint8ClampedArray {
    const out = new Uint8ClampedArray(pixels.length * 4)
    pixels.forEach((p, i) => out.set(p, i * 4))
    return out
  }
  const at = (a: Uint8ClampedArray, i: number): number[] => [...a.slice(i * 4, i * 4 + 4)]

  it('replaces an echo pixel with our colour for the same value', () => {
    const lut = reflectivityLut(0)
    const px = tile([[...SAMPLES.red.rgb, 255]])
    recolor(px, buildTranslation(0))
    const o = SAMPLES.red.index * 4
    expect(at(px, 0)).toEqual([lut[o], lut[o + 1], lut[o + 2], lut[o + 3]])
  })

  it('leaves transparent pixels untouched', () => {
    const px = tile([[0, 0, 0, 0]])
    recolor(px, buildTranslation(15))
    expect(at(px, 0)).toEqual([0, 0, 0, 0])
  })

  it('clears pixels under the floor', () => {
    const px = tile([[...SAMPLES.cyan.rgb, 255]])
    recolor(px, buildTranslation(25))
    expect(at(px, 0)).toEqual([0, 0, 0, 0])
  })

  it('clears colours that are not on the ramp rather than passing them through', () => {
    const px = tile([[7, 3, 200, 255]])
    recolor(px, buildTranslation(0))
    expect(at(px, 0)).toEqual([0, 0, 0, 0])
  })

  it('handles a mixed run in one pass', () => {
    const px = tile([
      [...SAMPLES.red.rgb, 255],
      [0, 0, 0, 0],
      [...SAMPLES.cyan.rgb, 255],
      [...SAMPLES.olive.rgb, 255],
    ])
    recolor(px, buildTranslation(25))
    expect(at(px, 0)[3]).toBe(255) // 51 dBZ, kept
    expect(at(px, 1)).toEqual([0, 0, 0, 0]) // was already empty
    expect(at(px, 2)).toEqual([0, 0, 0, 0]) // 18 dBZ, under the floor
    expect(at(px, 3)[3]).toBe(255) // 38 dBZ, kept
  })
})
