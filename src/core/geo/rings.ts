import type { Pt } from '@/core/geo/smooth'

/** A traced line whose ends meet is a closed ring. */
export function isClosedRing(coords: Pt[]): boolean {
  if (coords.length < 4) return false
  const a = coords[0]
  const b = coords[coords.length - 1]
  return a[0] === b[0] && a[1] === b[1]
}

export interface Bbox {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function ringBbox(coords: Pt[]): Bbox {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of coords) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY }
}

/** Ray-cast point-in-polygon. Callers bbox-prefilter; this is the slow path. */
export function ringContains(coords: Pt[], p: Pt): boolean {
  let inside = false
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const [xi, yi] = coords[i]
    const [xj, yj] = coords[j]
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}
