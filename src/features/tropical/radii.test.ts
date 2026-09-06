import { describe, expect, it } from 'vitest'
import { radiiAtTime, radiiValidMs } from '@/features/tropical/radii'

const H = 3600_000
const T0 = Date.UTC(2026, 8, 6, 9)

const feat = (tau: number, radii: number): GeoJSON.Feature => ({
  type: 'Feature',
  geometry: { type: 'Polygon', coordinates: [] },
  properties: { stormId: 'x', name: 'X', radii, tau, validMs: T0 + tau * H, ne: 1, se: 1, sw: 1, nw: 1 },
})

const all = [feat(0, 34), feat(0, 64), feat(12, 34), feat(24, 34), feat(24, 50), feat(72, 34)]

describe('radiiValidMs', () => {
  it('parses NHC YYYYMMDDHH as UTC', () => {
    expect(radiiValidMs('2026090609')).toBe(T0)
    expect(radiiValidMs('2026-09-06')).toBeNull()
  })
})

describe('radiiAtTime', () => {
  it('shows the current field at and before the advisory time', () => {
    expect(radiiAtTime(all, T0).map((f) => f.properties?.tau)).toEqual([0, 0])
    expect(radiiAtTime(all, T0 - 6 * H).map((f) => f.properties?.tau)).toEqual([0, 0])
  })

  it('holds a forecast hour until the next one is valid', () => {
    expect(radiiAtTime(all, T0 + 13 * H).map((f) => f.properties?.tau)).toEqual([12])
    expect(radiiAtTime(all, T0 + 24 * H).map((f) => f.properties?.tau)).toEqual([24, 24])
    expect(radiiAtTime(all, T0 + 47 * H).map((f) => f.properties?.tau)).toEqual([24, 24])
  })

  it('clamps to the last forecast hour beyond the advisory horizon', () => {
    expect(radiiAtTime(all, T0 + 200 * H).map((f) => f.properties?.tau)).toEqual([72])
  })

  it('is empty with nothing to show', () => {
    expect(radiiAtTime([], T0)).toEqual([])
  })
})
