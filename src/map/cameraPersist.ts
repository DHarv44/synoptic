import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { attachDevStore } from '@/dev/wx'

export interface SavedCamera {
  lon: number
  lat: number
  zoom: number
  bearing: number
  pitch: number
}

interface SavedCameraState {
  camera: SavedCamera | null
  save: (c: SavedCamera) => void
}

/**
 * Where the map was left. Separate from `useMapView`, which holds derived
 * bounds that are recomputed on load anyway — this is the small amount of
 * state worth writing to disk on every move.
 */
export const useSavedCamera = create<SavedCameraState>()(
  persist(
    (set) => ({
      camera: null,
      save: (camera) => set({ camera }),
    }),
    { name: 'synoptic.camera', version: 1 },
  ),
)

attachDevStore('savedCamera', useSavedCamera)
