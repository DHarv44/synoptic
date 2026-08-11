import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
 * Persisted so a reload comes back to the point you were interrogating —
 * the panels refetch for it on mount.
 */
export const useProbe = create<ProbeState>()(
  persist(
    (set) => ({
      point: null,
      setPoint: (p) => set({ point: p }),
      clear: () => set({ point: null }),
    }),
    { name: 'synoptic.probe', version: 1 },
  ),
)

attachDevStore('probe', useProbe)
