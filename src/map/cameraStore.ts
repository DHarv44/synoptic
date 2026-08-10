import { create } from 'zustand'
import { attachDevStore } from '@/dev/wx'

interface FlyTarget {
  lat: number
  lon: number
}

interface CameraState {
  target: FlyTarget | null
  requestFlyTo: (lat: number, lon: number) => void
  consume: () => void
}

/** Fly-to requests consumed by the camera rig inside the canvas. */
export const useCameraStore = create<CameraState>((set) => ({
  target: null,
  requestFlyTo: (lat, lon) => set({ target: { lat, lon } }),
  consume: () => set({ target: null }),
}))

attachDevStore('camera', useCameraStore)
