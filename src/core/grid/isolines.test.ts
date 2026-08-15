import { describe, expect, it } from 'vitest'
import { isolines, thresholdsFor } from '@/core/grid/isolines'

describe('isolines', () => {
  it('draws a single straight chained line across a linear gradient', () => {
    // Value = x over a 5×3 grid; the 2.5 contour is the vertical x=2.5.
    const w = 5
    const h = 3
    const vals = Array.from({ length: w * h }, (_, i) => i % w)
    const lines = isolines(vals, w, h, [2.5])
    expect(lines).toHaveLength(1)
    expect(lines[0].points.length).toBeGreaterThanOrEqual(3)
    for (const [x] of lines[0].points) expect(x).toBeCloseTo(2.5, 5)
  })

  it('closes a loop around a peak', () => {
    // Radial bump: high centre, low edges → one closed ring at mid-level.
    const w = 9
    const h = 9
    const vals = Array.from({ length: w * h }, (_, i) => {
      const x = i % w
      const y = Math.floor(i / w)
      return 10 - Math.hypot(x - 4, y - 4)
    })
    const lines = isolines(vals, w, h, [8])
    expect(lines).toHaveLength(1)
    const pts = lines[0].points
    expect(pts[0]).toEqual(pts[pts.length - 1])
  })

  it('emits nothing along grid borders for flat exteriors', () => {
    const w = 7
    const h = 7
    const vals = Array.from({ length: w * h }, (_, i) => {
      const x = i % w
      const y = Math.floor(i / w)
      return x >= 2 && x <= 4 && y >= 2 && y <= 4 ? 5 : 0
    })
    for (const line of isolines(vals, w, h, [2.5])) {
      for (const [x, y] of line.points) {
        expect(x).toBeGreaterThan(0)
        expect(x).toBeLessThan(w - 1)
        expect(y).toBeGreaterThan(0)
        expect(y).toBeLessThan(h - 1)
      }
    }
  })

  it('returns nothing for a flat field', () => {
    expect(isolines(new Array(25).fill(3), 5, 5, [2.5, 3.5])).toHaveLength(0)
  })

  it('keeps saddle lines from crossing', () => {
    // Classic saddle: opposite corners high.
    const vals = [1, 0, 0, 1]
    const lines = isolines(vals, 2, 2, [0.5])
    expect(lines).toHaveLength(2)
  })
})

describe('thresholdsFor', () => {
  it('aligns to the interval, inclusive of a max on the line', () => {
    expect(thresholdsFor(101, 112, 4)).toEqual([104, 108, 112])
  })
  it('handles negative ranges', () => {
    expect(thresholdsFor(-7, 3, 5)).toEqual([-5, 0])
  })
})
