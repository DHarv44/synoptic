import { create } from 'zustand'
import { attachDevStore } from '@/dev/wx'

/** [west, south, east, north] */
export type Bbox = [number, number, number, number]

interface ViewState {
  bounds: Bbox | null
  /** Degrees clockwise from north-up; 0 with pitch 0 means the compass can hide. */
  bearing: number
  pitch: number
  setBounds: (b: Bbox) => void
  setOrientation: (bearing: number, pitch: number) => void
}

/** Current map viewport: bounds on moveend, orientation live while rotating. */
export const useMapView = create<ViewState>((set) => ({
  bounds: null,
  bearing: 0,
  pitch: 0,
  setBounds: (bounds) => set({ bounds }),
  setOrientation: (bearing, pitch) =>
    set((s) => (s.bearing === bearing && s.pitch === pitch ? s : { bearing, pitch })),
}))

export function bboxIntersects(a: Bbox, b: Bbox): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1]
}

/** Bounding box of any GeoJSON geometry, for fit-to requests from panel rows. */
export function geometryBbox(g: GeoJSON.Geometry | null | undefined): Bbox | null {
  if (!g) return null
  const points: Array<{ lat: number; lon: number }> = []
  const walk = (c: unknown): void => {
    if (!Array.isArray(c)) return
    if (typeof c[0] === 'number') points.push({ lon: c[0] as number, lat: c[1] as number })
    else for (const x of c) walk(x)
  }
  if (g.type === 'GeometryCollection') for (const gg of g.geometries) walk((gg as { coordinates?: unknown }).coordinates)
  else walk(g.coordinates)
  return pointsBbox(points)
}

/** Bounding box of a point list, for fit-to requests from panel rows. */
export function pointsBbox(points: Array<{ lat: number; lon: number }>): Bbox | null {
  if (points.length === 0) return null
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const p of points) {
    if (p.lon < w) w = p.lon
    if (p.lon > e) e = p.lon
    if (p.lat < s) s = p.lat
    if (p.lat > n) n = p.lat
  }
  return [w, s, e, n]
}

attachDevStore('mapView', useMapView)
