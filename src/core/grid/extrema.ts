import type { PreparedGrid } from '@/core/grid/prepareGrid'

export interface Extremum {
  kind: 'high' | 'low'
  lat: number
  lon: number
  value: number
}

export interface ExtremaOptions {
  /**
   * Strict-extremum window diameter in degrees. Deliberately small: this
   * stage only nominates candidates, and `pickCenters` then keeps the ones
   * that own a closed contour — the test that actually decides what gets
   * a letter. Prominence heuristics were tried here first and failed both
   * ways: wide windows starve trough lows, tight ones starve weak highs.
   */
  windowDeg?: number
}

/** Raw local extrema of a field: candidate H/L positions, pre-ring-test. */
export function findExtrema(grid: PreparedGrid, opts: ExtremaOptions = {}): Extremum[] {
  const { values, w, h, step, latMin, lonMin } = grid
  const windowDeg = opts.windowDeg ?? 2
  const k = Math.max(1, Math.round(windowDeg / (2 * step)))
  const out: Extremum[] = []

  for (let y = k; y < h - k; y++) {
    for (let x = k; x < w - k; x++) {
      const v = values[y * w + x]
      let isMax = true
      let isMin = true
      for (let dy = -k; dy <= k && (isMax || isMin); dy++) {
        for (let dx = -k; dx <= k; dx++) {
          if (dx === 0 && dy === 0) continue
          const u = values[(y + dy) * w + (x + dx)]
          if (u >= v) isMax = false
          if (u <= v) isMin = false
        }
      }
      if (isMax || isMin) {
        out.push({
          kind: isMax ? 'high' : 'low',
          lat: latMin + y * step,
          lon: lonMin + x * step,
          value: v,
        })
      }
    }
  }
  return out
}
