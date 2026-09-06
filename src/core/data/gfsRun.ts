import { create } from 'zustand'

export interface GfsRunInfo {
  /** e.g. '20260906 06z'. */
  run: string
  fhour: number
  /** ISO valid time the payload answers. */
  valid: string
}

interface GfsRunState {
  byProduct: Record<string, GfsRunInfo>
  note: (product: string, info: GfsRunInfo) => void
}

/**
 * What run and hour each GFS-backed product is showing right now, so the
 * legends can say "GFS 06z +18 h" — a chart without its run and forecast
 * hour is a picture, not a product.
 */
export const useGfsRun = create<GfsRunState>((set) => ({
  byProduct: {},
  note: (product, info) => set((s) => ({ byProduct: { ...s.byProduct, [product]: info } })),
}))

/** "GFS 06z +18 h", or "GFS 06z analysis" at f000. */
export function gfsRunLabel(info: GfsRunInfo | undefined): string {
  if (!info) return 'GFS'
  const cycle = info.run.slice(-3)
  return info.fhour === 0 ? `GFS ${cycle} analysis` : `GFS ${cycle} +${info.fhour} h`
}
