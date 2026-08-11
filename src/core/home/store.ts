import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { attachDevStore } from '@/dev/wx'

export interface HomePoint {
  lat: number
  lon: number
  /** Label shown in panels; falls back to coordinates when unknown. */
  name?: string
}

interface HomeState {
  point: HomePoint | null
  setHome: (p: HomePoint) => void
  clear: () => void
}

/**
 * The user's own location — set from the map's locate button and kept
 * across reloads. Distinct from the probe, which is wherever they last
 * clicked: home is where forecasts and alerts default to when they haven't
 * asked about anywhere in particular.
 *
 * Stored locally only. It reaches the network solely as the coordinates of
 * a forecast request, the same as any probe click.
 */
export const useHome = create<HomeState>()(
  persist(
    (set) => ({
      point: null,
      setHome: (point) => set({ point }),
      clear: () => set({ point: null }),
    }),
    { name: 'synoptic.home', version: 1 },
  ),
)

attachDevStore('home', useHome)
