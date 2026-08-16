import { describe, expect, it } from 'vitest'
import { smoothGrid } from '@/core/grid/smoothGrid'

describe('smoothGrid', () => {
  it('leaves a constant field untouched and never mutates the input', () => {
    const flat = new Float64Array(16).fill(1013)
    const out = smoothGrid(flat, 4, 4, 3)
    expect([...out]).toEqual([...flat])
    expect(out).not.toBe(flat)
  })

  it('knocks down an isolated spike without moving the mean much', () => {
    const w = 9
    const h = 9
    const g = new Float64Array(w * h).fill(1000)
    g[4 * w + 4] = 1010
    const out = smoothGrid(g, w, h, 2)
    expect(out[4 * w + 4]).toBeLessThan(1004)
    const mean = [...out].reduce((a, b) => a + b, 0) / (w * h)
    expect(mean).toBeCloseTo(1000 + 10 / 81, 1)
  })

  it('preserves a broad gradient', () => {
    const w = 8
    const h = 3
    const g = new Float64Array(w * h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g[y * w + x] = x * 4
    const out = smoothGrid(g, w, h, 2)
    // Interior slope survives; only the clamped edges flatten slightly.
    expect(out[1 * w + 5] - out[1 * w + 2]).toBeGreaterThan(9)
  })
})
