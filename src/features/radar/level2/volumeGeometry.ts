import { dbzToRgb } from '@/features/radar/level2/colormap'
import type { VolumeTilt } from '@/features/radar/level2/worker'

const DEG = Math.PI / 180
const EFFECTIVE_EARTH_R_KM = (4 / 3) * 6371
const FALLBACK_RGB = [0.5, 0.5, 0.5] as const

/** Beam centre height (km) above the radar at ground range (km). */
export function beamHeightKm(rangeKm: number, elevDeg: number): number {
  return rangeKm * Math.sin(elevDeg * DEG) + (rangeKm * rangeKm) / (2 * EFFECTIVE_EARTH_R_KM)
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
  const { azBins, rangeBins, dbz } = t
  const stepKm = t.rangeStepM / 1000
  // Written by index into buffers sized for the worst case (every quad
  // emitted) and sliced to the used length at the end. Growing plain arrays
  // and converting boxed numbers to Float32Array afterwards cost more than
  // the geometry itself on a full volume.
  const maxFloats = azBins * (rangeBins - 1) * 6 * 3
  const pos = new Float32Array(maxFloats)
  const col = new Float32Array(maxFloats)
  let n = 0

  const at = (a: number, r: number): number => dbz[(a % azBins) * rangeBins + r]
  const vert = (a: number, r: number, value: number): void => {
    const azR = (a / azBins) * 360 * DEG
    const rangeKm = r * stepKm
    pos[n] = rangeKm * Math.sin(azR)
    pos[n + 1] = beamHeightKm(rangeKm, t.elevationDeg) * verticalExaggeration
    pos[n + 2] = -rangeKm * Math.cos(azR)
    const c = dbzToRgb(value) ?? FALLBACK_RGB
    col[n] = c[0]
    col[n + 1] = c[1]
    col[n + 2] = c[2]
    n += 3
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
  if (n === 0) return null
  return { positions: pos.slice(0, n), colors: col.slice(0, n) }
}
