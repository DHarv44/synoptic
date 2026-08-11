import { describe, expect, it } from 'vitest'
import { beamHeightKm, buildTiltMesh } from '@/features/radar/level2/volumeGeometry'
import { dbzToRgb } from '@/features/radar/level2/colormap'
import type { VolumeTilt } from '@/features/radar/level2/worker'

const AZ = 8
const RANGE = 4
const STEP_M = 1000

function tilt(fill: (a: number, r: number) => number, elevationDeg = 0.5): VolumeTilt {
  const dbz = new Float32Array(AZ * RANGE)
  for (let a = 0; a < AZ; a++) {
    for (let r = 0; r < RANGE; r++) dbz[a * RANGE + r] = fill(a, r)
  }
  return { elevationDeg, azBins: AZ, rangeBins: RANGE, rangeStepM: STEP_M, dbz }
}

describe('beamHeightKm', () => {
  it('follows the 4/3-earth curve', () => {
    // At 0° elevation the beam still climbs from refraction alone:
    // 100 km → 100²/(2 × 8495) ≈ 0.59 km.
    expect(beamHeightKm(100, 0)).toBeCloseTo(0.588, 2)
    expect(beamHeightKm(0, 5)).toBe(0)
    // Tilting up adds range × sin(elev) on top of the curve.
    expect(beamHeightKm(100, 1)).toBeCloseTo(100 * Math.sin(Math.PI / 180) + 0.588, 2)
  })
})

describe('buildTiltMesh', () => {
  it('returns null when nothing meets the threshold', () => {
    expect(buildTiltMesh(tilt(() => 10), 30, 4)).toBeNull()
    expect(buildTiltMesh(tilt(() => NaN), 5, 4)).toBeNull()
  })

  it('emits two triangles per fully-covered quad', () => {
    // Every gate above threshold: azBins × (rangeBins − 1) quads, 6 vertices
    // each. Azimuth wraps, so the last bin pairs with the first.
    const mesh = buildTiltMesh(tilt(() => 40), 30, 4)
    expect(mesh).not.toBeNull()
    const verts = AZ * (RANGE - 1) * 6
    expect(mesh?.positions.length).toBe(verts * 3)
    expect(mesh?.colors.length).toBe(verts * 3)
  })

  it('drops a quad unless all four corners clear the threshold', () => {
    // One sub-threshold gate invalidates every quad touching it. At (0,0)
    // that is the quads anchored at (0,0) and (azBins−1, 0) — two quads.
    const mesh = buildTiltMesh(tilt((a, r) => (a === 0 && r === 0 ? 10 : 40)), 30, 4)
    const full = AZ * (RANGE - 1)
    expect(mesh?.positions.length).toBe((full - 2) * 6 * 3)
  })

  it('places vertices at true beam height with the exaggeration applied', () => {
    const mesh = buildTiltMesh(tilt(() => 40), 30, 4)
    // First vertex is azimuth bin 0, range bin 0 — due north, zero range.
    expect(mesh?.positions[0]).toBeCloseTo(0, 6)
    expect(mesh?.positions[1]).toBeCloseTo(0, 6)
    expect(mesh?.positions[2]).toBeCloseTo(0, 6)
    // Second vertex is range bin 1 (1 km), still due north: −z, y exaggerated.
    expect(mesh?.positions[3]).toBeCloseTo(0, 6)
    expect(mesh?.positions[4]).toBeCloseTo(beamHeightKm(1, 0.5) * 4, 6)
    expect(mesh?.positions[5]).toBeCloseTo(-1, 6)
  })

  it('colors vertices from the shared reflectivity table', () => {
    const mesh = buildTiltMesh(tilt(() => 40), 30, 4)
    const expected = dbzToRgb(40)
    expect(expected).not.toBeNull()
    expect(mesh?.colors[0]).toBeCloseTo(expected![0], 6)
    expect(mesh?.colors[1]).toBeCloseTo(expected![1], 6)
    expect(mesh?.colors[2]).toBeCloseTo(expected![2], 6)
  })
})

describe('dbzToRgb', () => {
  it('matches the LUT the shader uses, and floors below 5 dBZ', () => {
    expect(dbzToRgb(0)).toBeNull()
    expect(dbzToRgb(-40)).toBeNull()
    // 50 dBZ is the red stop #fd0000.
    const red = dbzToRgb(50)
    expect(red?.[0]).toBeCloseTo(0xfd / 255, 6)
    expect(red?.[1]).toBe(0)
    expect(red?.[2]).toBe(0)
    // Above the top stop it clamps rather than dropping out.
    expect(dbzToRgb(200)).not.toBeNull()
  })
})
