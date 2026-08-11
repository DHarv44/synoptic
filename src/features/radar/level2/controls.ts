import { useRadar } from '@/features/radar/level2/store'
import { selectSweep } from '@/features/radar/level2/bridge'
import type { TiltInfo } from '@/features/radar/level2/worker'

/**
 * Actions behind the radar controls. The panel and the keyboard shortcuts
 * both route through here so there is one definition of what "next tilt"
 * means — the store stays the single source of truth, the worker is told
 * only after it changes.
 */

/**
 * Cuts carrying a moment, low to high. A volume coverage pattern repeats
 * low elevations as split cuts (surveillance then Doppler), so the tilts
 * available for velocity are not the same list as for reflectivity.
 */
export function tiltsFor(tilts: TiltInfo[], moment: string): TiltInfo[] {
  return tilts.filter((t) => t.moments.includes(moment))
}

function apply(elevNum: number, moment: string, raw: boolean): void {
  useRadar.getState().set({ elevNum, moment })
  selectSweep(elevNum, moment, raw)
}

/** Move `delta` cuts up (+) or down (−); clamps at the ends. */
export function stepTilt(delta: number): void {
  const s = useRadar.getState()
  const available = tiltsFor(s.tilts, s.moment)
  if (available.length === 0) return
  const idx = available.findIndex((t) => t.num === s.elevNum)
  const next = available[Math.min(Math.max((idx < 0 ? 0 : idx) + delta, 0), available.length - 1)]
  if (next && next.num !== s.elevNum) apply(next.num, s.moment, s.raw)
}

/**
 * Switch moment, keeping the closest elevation angle rather than the
 * elevation *number* — split cuts mean the same number is a different
 * angle between moments, which would jump the view unexpectedly.
 */
export function setMoment(moment: string): void {
  const s = useRadar.getState()
  if (moment === s.moment) return
  const available = tiltsFor(s.tilts, moment)
  if (available.length === 0) {
    apply(s.elevNum, moment, s.raw)
    return
  }
  const currentDeg = s.tilts.find((t) => t.num === s.elevNum)?.deg ?? available[0].deg
  const nearest = available.reduce((best, t) =>
    Math.abs(t.deg - currentDeg) < Math.abs(best.deg - currentDeg) ? t : best,
  )
  apply(nearest.num, moment, s.raw)
}

/** Storm-relative velocity is a shader toggle — no re-decode needed. */
export function setSrv(on: boolean): void {
  useRadar.getState().set({ srv: on })
}

/** RAW bypasses dealiasing, so the sweep has to be decoded again. */
export function setRaw(on: boolean): void {
  const s = useRadar.getState()
  s.set({ raw: on })
  selectSweep(s.elevNum, s.moment, on)
}
