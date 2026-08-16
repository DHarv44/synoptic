import { describe, expect, it } from 'vitest'
import { pickCenters } from '@/core/grid/centers'
import { contourLines } from '@/core/grid/contours'
import { findExtrema } from '@/core/grid/extrema'
import type { PreparedGrid } from '@/core/grid/prepareGrid'

/** 41×41, 0.5°-step field: flat 1012, a 1022 high at (−110, 40), a 1004 low at (−105, 35). */
function synopticGrid(): PreparedGrid {
  const w = 41
  const h = 41
  const values = new Float64Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const lon = -120 + x * 0.5
      const lat = 30 + y * 0.5
      const high = 10 * Math.exp(-((lon + 110) ** 2 + (lat - 40) ** 2) / 8)
      const low = -8 * Math.exp(-((lon + 105) ** 2 + (lat - 35) ** 2) / 6)
      values[y * w + x] = 1012 + high + low
    }
  }
  return { values, w, h, step: 0.5, latMin: 30, lonMin: -120 }
}

describe('findExtrema', () => {
  it('nominates the high and the low', () => {
    const found = findExtrema(synopticGrid())
    expect(found.some((e) => e.kind === 'high' && Math.abs(e.lon + 110) < 1)).toBe(true)
    expect(found.some((e) => e.kind === 'low' && Math.abs(e.lon + 105) < 1)).toBe(true)
  })

  it('a flat field nominates nothing', () => {
    const flat: PreparedGrid = {
      values: new Float64Array(21 * 21).fill(1013),
      w: 21,
      h: 21,
      step: 1,
      latMin: 20,
      lonMin: -120,
    }
    expect(findExtrema(flat)).toHaveLength(0)
  })
})

describe('pickCenters', () => {
  it('marks exactly the ringed centres, each inside its own closed contour', () => {
    const grid = synopticGrid()
    const lines = contourLines(grid, { interval: 2, smoothPasses: 0 })
    const centers = pickCenters(findExtrema(grid), lines)
    expect(centers).toHaveLength(2)
    const high = centers.find((c) => c.kind === 'high')
    const low = centers.find((c) => c.kind === 'low')
    expect(high?.lon).toBeCloseTo(-110, 0)
    expect(high?.value).toBeGreaterThan(1020)
    expect(low?.lon).toBeCloseTo(-105, 0)
  })

  it('a ripple with no closed contour of its own earns no letter', () => {
    const grid = synopticGrid()
    // 0.8 hPa bump: real local max, but no 2-hPa contour will ring it.
    grid.values[30 * grid.w + 8] += 0.8
    const lines = contourLines(grid, { interval: 2, smoothPasses: 0 })
    const centers = pickCenters(findExtrema(grid), lines)
    expect(centers).toHaveLength(2)
  })

  it('no rings at all means no centres', () => {
    const grid = synopticGrid()
    expect(pickCenters(findExtrema(grid), [])).toHaveLength(0)
  })
})
