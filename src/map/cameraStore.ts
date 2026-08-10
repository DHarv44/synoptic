import { create } from 'zustand'
import { attachDevStore } from '@/dev/wx'

interface FlyTarget {
  lat: number
  lon: number
}

/** [west, south, east, north] */
type FitBounds = [number, number, number, number]

interface CameraState {
  target: FlyTarget | null
  fit: FitBounds | null
  requestFlyTo: (lat: number, lon: number) => void
  requestFitBounds: (bounds: FitBounds) => void
  consume: () => void
  consumeFit: () => void
}

/** Camera requests (fly-to / fit-bounds) consumed by MapView. */
export const useCameraStore = create<CameraState>((set) => ({
  target: null,
  fit: null,
  requestFlyTo: (lat, lon) => set({ target: { lat, lon } }),
  requestFitBounds: (bounds) => set({ fit: bounds }),
  consume: () => set({ target: null }),
  consumeFit: () => set({ fit: null }),
}))

attachDevStore('camera', useCameraStore)
