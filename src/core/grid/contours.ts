import { chaikin, type Pt } from '@/core/geo/smooth'
import { isolines, thresholdsFor } from '@/core/grid/isolines'
import type { PreparedGrid } from '@/core/grid/prepareGrid'
import { smoothGrid } from '@/core/grid/smoothGrid'

export interface ContourOptions {
  /** Contour interval in display units, thresholds at absolute multiples. */
  interval: number
  /** Drop contours below this level (CAPE's meaningless low end). */
  floor?: number
  /** Passes of the 9-point smoother before contouring; 0 = raw field. */
  smoothPasses?: number
  /** Chaikin iterations on the traced lines; 0 = grid-resolution polylines. */
  curvePasses?: number
}

export interface ContourLine {
  level: number
  /** [lon, lat] positions. */
  coordinates: Pt[]
}

/**
 * The whole contour pipeline: smooth the field the way an analyst's eye
 * does, trace isolines at conventional levels, project to lon/lat, and
 * round the grid-resolution corners into drawn curves. Lines that cross
 * the antimeridian terminate at the seam rather than wrapping.
 */
export function contourLines(grid: PreparedGrid, opts: ContourOptions): ContourLine[] {
  const { w, h, step, latMin, lonMin } = grid
  const values =
    (opts.smoothPasses ?? 0) > 0
      ? smoothGrid(grid.values, w, h, opts.smoothPasses ?? 0)
      : grid.values

  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }
  const thresholds = thresholdsFor(min, max, opts.interval).filter(
    (t) => opts.floor === undefined || t >= opts.floor,
  )

  return isolines(values, w, h, thresholds).map((line) => ({
    level: line.level,
    coordinates: chaikin(
      line.points.map(([x, y]): Pt => [lonMin + x * step, latMin + y * step]),
      opts.curvePasses ?? 2,
    ),
  }))
}
