/** Wind-profile kinematics: shear, Bunkers storm motion, SRH. */

import type { SoundingLevel } from '@/core/data/openMeteo/sounding'

export interface UV {
  u: number
  v: number
}

/** Meteorological (from-direction, speed) → u/v components. */
export function toUV(ws: number, wdDeg: number): UV {
  const rad = (wdDeg * Math.PI) / 180
  return { u: -ws * Math.sin(rad), v: -ws * Math.cos(rad) }
}

/** Wind at height AGL (m) by linear interpolation over the profile. */
function windAt(levels: SoundingLevel[], aglM: number, z0: number): UV {
  const target = z0 + aglM
  for (let i = 0; i < levels.length - 1; i++) {
    const a = levels[i]
    const b = levels[i + 1]
    if (target >= a.z && target <= b.z) {
      const f = (target - a.z) / Math.max(b.z - a.z, 1)
      const ua = toUV(a.ws, a.wd)
      const ub = toUV(b.ws, b.wd)
      return { u: ua.u + f * (ub.u - ua.u), v: ua.v + f * (ub.v - ua.v) }
    }
  }
  const last = target < levels[0].z ? levels[0] : levels[levels.length - 1]
  return toUV(last.ws, last.wd)
}

/** Bulk shear magnitude (m/s) between the surface and aglM. */
export function bulkShear(levels: SoundingLevel[], aglM: number): number {
  const z0 = levels[0].z
  const sfc = toUV(levels[0].ws, levels[0].wd)
  const top = windAt(levels, aglM, z0)
  return Math.hypot(top.u - sfc.u, top.v - sfc.v)
}

/** Bunkers right-mover storm motion estimate. */
export function bunkersRightMover(levels: SoundingLevel[]): UV {
  const z0 = levels[0].z
  // 0–6 km mean wind (500 m samples)
  let mu = 0
  let mv = 0
  const N = 13
  for (let i = 0; i < N; i++) {
    const w = windAt(levels, (6000 * i) / (N - 1), z0)
    mu += w.u / N
    mv += w.v / N
  }
  const sfc = windAt(levels, 0, z0)
  const top = windAt(levels, 6000, z0)
  const su = top.u - sfc.u
  const sv = top.v - sfc.v
  const mag = Math.hypot(su, sv) || 1
  // 7.5 m/s to the right of the shear vector
  return { u: mu + (7.5 * sv) / mag, v: mv - (7.5 * su) / mag }
}

/** Storm-relative helicity (m²/s²) from the surface to aglM. */
export function stormRelativeHelicity(
  levels: SoundingLevel[],
  aglM: number,
  storm: UV,
): number {
  const z0 = levels[0].z
  const STEP = 250
  let srh = 0
  for (let z = 0; z + STEP <= aglM; z += STEP) {
    const a = windAt(levels, z, z0)
    const b = windAt(levels, z + STEP, z0)
    srh += (b.u - storm.u) * (a.v - storm.v) - (a.u - storm.u) * (b.v - storm.v)
  }
  return srh
}
