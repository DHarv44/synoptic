import { describe, expect, it } from 'vitest'
import { contourLines } from '@/core/grid/contours'
import type { PreparedGrid } from '@/core/grid/prepareGrid'

/** A 21×21, 1°-step grid: flat 1012 with a smooth bump peaking ~1022 mid. */
function bumpGrid(): PreparedGrid {
  const w = 21
  const h = 21
  const values = new Float64Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d2 = (x - 10) ** 2 + (y - 10) ** 2
      values[y * w + x] = 1012 + 10 * Math.exp(-d2 / 18)
    }
  }
  return { values, w, h, step: 1, latMin: 20, lonMin: -120 }
}

describe('contourLines', () => {
  it('rings a local high with closed contours at conventional levels', () => {
    const lines = contourLines(bumpGrid(), { interval: 2, smoothPasses: 2 })
    const levels = [...new Set(lines.map((l) => l.level))]
    expect(levels).toContain(1014)
    expect(levels).toContain(1020)
    // Every ring around the bump closes: first point equals last.
    for (const l of lines) {
      const a = l.coordinates[0]
      const b = l.coordinates[l.coordinates.length - 1]
      expect(a[0]).toBeCloseTo(b[0], 9)
      expect(a[1]).toBeCloseTo(b[1], 9)
    }
  })

  it('kills a one-cell noise spike that would otherwise draw a squiggle', () => {
    const g = bumpGrid()
    g.values[3 * g.w + 3] += 3 // 1015-ish spike in the flat 1012 corner
    const raw = contourLines(g, { interval: 2, smoothPasses: 0 })
    const smoothed = contourLines(g, { interval: 2, smoothPasses: 4 })
    expect(smoothed.length).toBeLessThan(raw.length)
  })

  it('applies the floor filter', () => {
    const lines = contourLines(bumpGrid(), { interval: 2, floor: 1018, smoothPasses: 0 })
    expect(Math.min(...lines.map((l) => l.level))).toBeGreaterThanOrEqual(1018)
  })

  it('projects into the grid corner coordinates', () => {
    const [line] = contourLines(bumpGrid(), { interval: 2, smoothPasses: 0 })
    for (const [lon, lat] of line.coordinates) {
      expect(lon).toBeGreaterThanOrEqual(-120)
      expect(lon).toBeLessThanOrEqual(-100)
      expect(lat).toBeGreaterThanOrEqual(20)
      expect(lat).toBeLessThanOrEqual(40)
    }
  })
})
