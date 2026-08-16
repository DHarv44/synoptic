import type { GridField } from '@/core/data/gfsGrid'

/** A global scalar grid in display units, on map-ordered −180…180 longitudes. */
export interface PreparedGrid {
  values: Float64Array
  w: number
  h: number
  /** Degrees per cell, both axes. */
  step: number
  latMin: number
  lonMin: number
}

/**
 * GFS grids arrive 0…360; the map runs −180…180. Swap the halves and map
 * every value into display units in one pass.
 */
export function prepareGrid(field: GridField, toDisplay: (v: number) => number): PreparedGrid {
  const { width, height, step, latMin } = field.header
  const values = new Float64Array(width * height)
  const half = Math.floor(width / 2)
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      values[j * width + i] = toDisplay(field.values[j * width + ((i + half) % width)])
    }
  }
  return { values, w: width, h: height, step, latMin, lonMin: -180 }
}
