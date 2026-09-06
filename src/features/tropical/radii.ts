/**
 * Wind radii that follow the clock. NHC forecasts the 34/50/64 kt extent
 * per quadrant at each forecast hour; the timeline picks which hour's set
 * to draw, so stepping forward shows the wind field the advisory expects,
 * not the one it has.
 */

export type RadiiKt = 34 | 50 | 64

/** The threshold's colour — TS force yellow, 50 kt orange, hurricane red. */
export const RADII_COLORS: Record<RadiiKt, string> = {
  34: '#ffd54a',
  50: '#ff9a3c',
  64: '#ff5252',
}

export const RADII_LABEL: Record<RadiiKt, string> = {
  34: '34 kt · tropical-storm force',
  50: '50 kt',
  64: '64 kt · hurricane force',
}

/** '2026090609' → epoch ms (UTC). */
export function radiiValidMs(validtime: string): number | null {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})$/.exec(validtime)
  if (!m) return null
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]))
}

export interface RadiiProps {
  stormId: string
  name: string
  radii: RadiiKt
  tau: number
  validMs: number
  ne: number
  se: number
  sw: number
  nw: number
}

/**
 * Which forecast hour's radii belong on the map at `hourMs`: the latest set
 * whose valid time is at or before the clock; before the first set, the
 * first (tau 0 — the current field); after the last, the last, since the
 * advisory says nothing further and pretending otherwise would be worse.
 */
export function radiiAtTime(features: GeoJSON.Feature[], hourMs: number): GeoJSON.Feature[] {
  const byTau = new Map<number, { validMs: number; features: GeoJSON.Feature[] }>()
  for (const f of features) {
    const p = f.properties as Partial<RadiiProps> | null
    if (!p || typeof p.tau !== 'number' || typeof p.validMs !== 'number') continue
    const slot = byTau.get(p.tau) ?? { validMs: p.validMs, features: [] }
    slot.features.push(f)
    byTau.set(p.tau, slot)
  }
  const taus = [...byTau.entries()].sort((a, b) => a[1].validMs - b[1].validMs)
  if (taus.length === 0) return []
  let chosen = taus[0]
  for (const t of taus) if (t[1].validMs <= hourMs) chosen = t
  return chosen[1].features
}
