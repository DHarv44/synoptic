import type { GridField } from '@/core/data/gfsGrid'
import { chaikin, type Pt } from '@/core/geo/smooth'
import { isolines, thresholdsFor } from '@/core/grid/isolines'

export interface FieldSpec {
  key: string
  label: string
  /** Raw SI → the unit the chart labels in. */
  toDisplay: (v: number) => number
  /** Contour interval, in display units. */
  interval: number
  /** Lowest contour worth drawing; CAPE below ~500 is everywhere and nothing. */
  floor?: number
  unitLabel: string
}

/**
 * The intervals are the conventional chart ones — 4 hPa surface isobars,
 * 6 dam at 500 mb, 2 °C at 850 — so anyone who reads weather charts can
 * read these without a legend.
 */
export const FIELD_SPECS: Record<string, FieldSpec> = {
  mslp: {
    key: 'mslp',
    label: 'MSLP isobars',
    toDisplay: (pa) => pa / 100,
    interval: 4,
    unitLabel: 'hPa',
  },
  hgt500: {
    key: 'hgt500',
    label: '500 mb heights',
    toDisplay: (gpm) => gpm / 10,
    interval: 6,
    unitLabel: 'dam',
  },
  temp850: {
    key: 'temp850',
    label: '850 mb temperature',
    toDisplay: (k) => k - 273.15,
    interval: 2,
    unitLabel: '°C',
  },
  cape: {
    key: 'cape',
    label: 'CAPE',
    toDisplay: (v) => v,
    interval: 500,
    floor: 500,
    unitLabel: 'J/kg',
  },
}

/** Contouring resolution: full 0.5° grid. The 1° stride we started with
 * over-smoothed — isobars lost the kinks at fronts that make a chart read
 * as analysis, and the compute (one pass per fetch, ~30 min apart) is fine. */
const STRIDE = 1

/**
 * Contours of a global grid as GeoJSON lines, one feature per chained line,
 * labelled in display units.
 *
 * Longitude is rotated so the chart runs −180…180 like the map; lines that
 * cross the antimeridian terminate at the seam rather than wrapping. Over
 * the mid-Pacific that clips an isobar occasionally — accepted for now.
 */
export function fieldGeoJSON(field: GridField, spec: FieldSpec): GeoJSON.FeatureCollection {
  const { width, height, step, latMin } = field.header
  const w = Math.floor(width / STRIDE)
  const h = Math.floor((height - 1) / STRIDE) + 1
  const outStep = step * STRIDE

  const grid = new Float64Array(w * h)
  const half = Math.floor(w / 2)
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const srcCol = ((i + half) % w) * STRIDE
      grid[j * w + i] = spec.toDisplay(field.values[j * STRIDE * width + srcCol])
    }
  }

  let min = Infinity
  let max = -Infinity
  for (const v of grid) {
    if (v < min) min = v
    if (v > max) max = v
  }
  const thresholds = thresholdsFor(min, max, spec.interval).filter(
    (t) => spec.floor === undefined || t >= spec.floor,
  )

  return {
    type: 'FeatureCollection',
    features: isolines(grid, w, h, thresholds).map((line) => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        // Chaikin the grid-resolution polyline: analysts draw curves.
        coordinates: chaikin(
          line.points.map(([x, y]): Pt => [-180 + x * outStep, latMin + y * outStep]),
        ),
      },
      properties: { label: String(Math.round(line.level)) },
    })),
  }
}
