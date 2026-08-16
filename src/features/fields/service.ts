import type { GridField } from '@/core/data/gfsGrid'
import { contourLines } from '@/core/grid/contours'
import { prepareGrid } from '@/core/grid/prepareGrid'

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

/**
 * Sea-level reduction noise over terrain needs the analyst's-eye smoothing
 * pass or the Rockies wallpaper themselves in closed squiggles. Four
 * passes of the 9-point smoother ≈ 1° of gentling on the 0.5° grid.
 */
const SMOOTH_PASSES = 4

/** Contours of a field as GeoJSON, one feature per line, chart semantics only. */
export function fieldGeoJSON(
  field: GridField,
  spec: FieldSpec,
  intervalOverride?: number,
): GeoJSON.FeatureCollection {
  const lines = contourLines(prepareGrid(field, spec.toDisplay), {
    interval: intervalOverride ?? spec.interval,
    floor: spec.floor,
    smoothPasses: SMOOTH_PASSES,
  })
  return {
    type: 'FeatureCollection',
    features: lines.map((line) => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: line.coordinates },
      properties: { label: String(Math.round(line.level)) },
    })),
  }
}
