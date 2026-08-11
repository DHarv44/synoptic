import { create } from 'zustand'
import { attachDevStore } from '@/dev/wx'

interface FlyTarget {
  lat: number
  lon: number
  /** Minimum zoom to arrive at; the current zoom is kept if already closer. */
  zoom?: number
}

/** [west, south, east, north] */
type FitBounds = [number, number, number, number]

interface CameraState {
  target: FlyTarget | null
  fit: FitBounds | null
  /** Bumped per reset request; a counter so repeat presses always fire. */
  resetNonce: number
  requestFlyTo: (lat: number, lon: number, zoom?: number) => void
  requestFitBounds: (bounds: FitBounds) => void
  requestResetNorth: () => void
  consume: () => void
  consumeFit: () => void
}

/** Camera requests (fly-to / fit-bounds / reset) consumed by MapView. */
export const useCameraStore = create<CameraState>((set) => ({
  target: null,
  fit: null,
  resetNonce: 0,
  requestFlyTo: (lat, lon, zoom) => set({ target: { lat, lon, zoom } }),
  requestFitBounds: (bounds) => set({ fit: bounds }),
  requestResetNorth: () => set((s) => ({ resetNonce: s.resetNonce + 1 })),
  consume: () => set({ target: null }),
  consumeFit: () => set({ fit: null }),
}))

attachDevStore('camera', useCameraStore)
