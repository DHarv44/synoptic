import type { GridField } from '@/core/data/gfsGrid'
import { pickCenters } from '@/core/grid/centers'
import { contourLines } from '@/core/grid/contours'
import { findExtrema } from '@/core/grid/extrema'
import { prepareGrid } from '@/core/grid/prepareGrid'
import { smoothGrid } from '@/core/grid/smoothGrid'
import { MAP_COLORS as C } from '@/core/mapColors'

export interface FieldSpec {
  key: string
  label: string
  /** Raw SI → the unit the chart labels in. */
  toDisplay: (v: number) => number
  /** Contour interval, in display units. */
  interval: number
  /** Lowest contour worth drawing; CAPE below ~500 is everywhere and nothing. */
  floor?: number
  /** Mark H/L centres derived from this field (pressure and heights, not CAPE). */
  markExtrema?: boolean
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
    markExtrema: true,
    unitLabel: 'hPa',
  },
  hgt500: {
    key: 'hgt500',
    label: '500 mb heights',
    toDisplay: (gpm) => gpm / 10,
    interval: 6,
    markExtrema: true,
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

/**
 * One light pass: MSLET is already a terrain-sane reduction, so smoothing
 * only has to gentle the contours, not paper over reduction noise — and a
 * heavier hand erases the very maxima the centres need.
 */
const SMOOTH_PASSES = 1

export interface FieldChart {
  contours: GeoJSON.FeatureCollection
  centers: GeoJSON.FeatureCollection | null
}

/**
 * Contours and H/L centres from ONE smoothed field. A centre is marked
 * exactly when a closed isoline encloses a field extremum (pickCenters),
 * so every letter on the chart sits inside a circle by construction.
 */
export function fieldChart(
  field: GridField,
  spec: FieldSpec,
  intervalOverride?: number,
): FieldChart {
  const interval = intervalOverride ?? spec.interval
  const grid = prepareGrid(field, spec.toDisplay)
  const smoothed = { ...grid, values: smoothGrid(grid.values, grid.w, grid.h, SMOOTH_PASSES) }

  const lines = contourLines(smoothed, { interval, floor: spec.floor, smoothPasses: 0 })
  const contours: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: lines.map((line) => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: line.coordinates },
      properties: { label: String(Math.round(line.level)) },
    })),
  }

  if (!spec.markExtrema) return { contours, centers: null }
  const centers: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: pickCenters(findExtrema(smoothed), lines, {
      minDepth: interval / 2,
      minRingDeg: 1.5,
    }).map((c) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
      properties: {
        letter: c.kind === 'high' ? 'H' : 'L',
        value: String(Math.round(c.value)),
        color: c.kind === 'high' ? C.blue4 : C.red5,
      },
    })),
  }
  return { contours, centers }
}
