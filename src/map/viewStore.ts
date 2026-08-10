import { create } from 'zustand'
import { attachDevStore } from '@/dev/wx'

/** [west, south, east, north] */
export type Bbox = [number, number, number, number]

interface ViewState {
  bounds: Bbox | null
  setBounds: (b: Bbox) => void
}

/** Current map viewport bounds (updated on moveend by MapView). */
export const useMapView = create<ViewState>((set) => ({
  bounds: null,
  setBounds: (bounds) => set({ bounds }),
}))

export function bboxIntersects(a: Bbox, b: Bbox): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1]
}

attachDevStore('mapView', useMapView)
