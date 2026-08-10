import { create } from 'zustand'
import { attachDevStore } from '@/dev/wx'

export interface ProbePoint {
  lat: number
  lon: number
  /** Display name when set via search; undefined for raw globe clicks. */
  name?: string
}

interface ProbeState {
  point: ProbePoint | null
  setPoint: (p: ProbePoint) => void
  clear: () => void
}

/**
 * The probe: the currently interrogated location. Globe clicks and search
 * set it; every analysis panel reads it (PLAN.md interaction spine).
 */
export const useProbe = create<ProbeState>((set) => ({
  point: null,
  setPoint: (p) => set({ point: p }),
  clear: () => set({ point: null }),
}))

attachDevStore('probe', useProbe)
