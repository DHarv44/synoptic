import { dbzToCss } from '@/features/radar/level2/colormap'
import type { VolumeTilt } from '@/features/radar/level2/worker'

const DEG = Math.PI / 180
const EFFECTIVE_EARTH_R_KM = (4 / 3) * 6371

/** Beam centre height (km) above the radar at ground range (km). */
export function beamHeightKm(rangeKm: number, elevDeg: number): number {
  return rangeKm * Math.sin(elevDeg * DEG) + (rangeKm * rangeKm) / (2 * EFFECTIVE_EARTH_R_KM)
}

function rgb(dbz: number): [number, number, number] | null {
  const css = dbzToCss(dbz)
  if (css === null) return null
  return [
    parseInt(css.slice(1, 3), 16) / 255,
    parseInt(css.slice(3, 5), 16) / 255,
    parseInt(css.slice(5, 7), 16) / 255,
  ]
}

export interface TiltMesh {
  positions: Float32Array
  colors: Float32Array
}

/**
 * One tilt's echo surface: quads emitted only where all four corners meet
 * the threshold, placed at their true beam height. x/z are km east/north,
 * y is km up × exaggeration — the surface really is the radar's cone.
 */
export function buildTiltMesh(
  t: VolumeTilt,
  thresholdDbz: number,
  verticalExaggeration: number,
): TiltMesh | null {
  const pos: number[] = []
  const col: number[] = []
  const { azBins, rangeBins, dbz } = t
  const stepKm = t.rangeStepM / 1000

  const at = (a: number, r: number): number => dbz[(a % azBins) * rangeBins + r]
  const vert = (a: number, r: number, value: number): void => {
    const azR = (a / azBins) * 360 * DEG
    const rangeKm = r * stepKm
    pos.push(
      rangeKm * Math.sin(azR),
      beamHeightKm(rangeKm, t.elevationDeg) * verticalExaggeration,
      -rangeKm * Math.cos(azR),
    )
    const c = rgb(value) ?? [0.5, 0.5, 0.5]
    col.push(c[0], c[1], c[2])
  }

  for (let a = 0; a < azBins; a++) {
    for (let r = 0; r < rangeBins - 1; r++) {
      const v00 = at(a, r)
      const v10 = at(a + 1, r)
      const v01 = at(a, r + 1)
      const v11 = at(a + 1, r + 1)
      if (
        !(v00 >= thresholdDbz) ||
        !(v10 >= thresholdDbz) ||
        !(v01 >= thresholdDbz) ||
        !(v11 >= thresholdDbz)
      ) {
        continue
      }
      vert(a, r, v00)
      vert(a, r + 1, v01)
      vert(a + 1, r, v10)
      vert(a + 1, r, v10)
      vert(a, r + 1, v01)
      vert(a + 1, r + 1, v11)
    }
  }
  if (pos.length === 0) return null
  return { positions: new Float32Array(pos), colors: new Float32Array(col) }
}
