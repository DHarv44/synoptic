import type { Sounding } from '@/core/data/openMeteo/sounding'
import { precipitableWater, surfaceCape } from '@/core/met/thermo'
import { bulkShear, bunkersRightMover, stormRelativeHelicity } from '@/core/met/kinematics'

export const MS_TO_KT = 1.94384

export interface SoundingIndices {
  cape: number
  cin: number
  liftedIndex: number | null
  lclP: number
  lfcP: number | null
  elP: number | null
  /** Precipitable water, mm. */
  pwat: number
  /** Bulk shear magnitude, m/s. */
  shear1: number
  shear6: number
  /** Storm-relative helicity, m²/s². */
  srh1: number
  srh3: number
  /** Bunkers right-mover: direction from (deg) and speed (m/s). */
  stormDirDeg: number
  stormSpdMs: number
}

/**
 * Every derived severe-weather index for a profile, as numbers. Formatting
 * belongs to whoever displays them — the indices table and the collapsed
 * section summary both read from here so they can't disagree.
 */
export function deriveIndices(sounding: Sounding): SoundingIndices {
  const lv = sounding.levels
  const cape = surfaceCape(
    lv.map((l) => l.p),
    lv.map((l) => l.T),
    lv[0].T,
    lv[0].Td,
  )
  const rm = bunkersRightMover(lv)
  return {
    cape: cape.cape,
    cin: cape.cin,
    liftedIndex: cape.liftedIndex,
    lclP: cape.lclP,
    lfcP: cape.lfcP,
    elP: cape.elP,
    pwat: precipitableWater(
      lv.map((l) => l.p),
      lv.map((l) => l.Td),
    ),
    shear1: bulkShear(lv, 1000),
    shear6: bulkShear(lv, 6000),
    srh1: stormRelativeHelicity(lv, 1000, rm),
    srh3: stormRelativeHelicity(lv, 3000, rm),
    stormDirDeg: ((Math.atan2(-rm.u, -rm.v) * 180) / Math.PI + 360) % 360,
    stormSpdMs: Math.hypot(rm.u, rm.v),
  }
}
