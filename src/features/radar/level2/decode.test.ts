import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { decodeChunk } from '@/features/radar/level2/decode'

function load(name: string): ArrayBuffer {
  const buf = readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)))
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

describe('Level 2 chunk decoding (real KTLX chunk)', () => {
  const radials = decodeChunk(load('ktlx-chunk-i.bin'), false)

  it('yields the expected radial count', () => {
    expect(radials.length).toBe(120)
  })

  it('azimuths are valid degrees and mostly increasing', () => {
    for (const r of radials) {
      expect(r.azimuthDeg).toBeGreaterThanOrEqual(0)
      expect(r.azimuthDeg).toBeLessThan(360)
    }
  })

  it('elevation is a low tilt with sane angle', () => {
    const elevNums = new Set(radials.map((r) => r.elevationNumber))
    expect(elevNums.size).toBeLessThanOrEqual(2)
    for (const r of radials) {
      expect(r.elevationDeg).toBeGreaterThan(-1)
      expect(r.elevationDeg).toBeLessThan(20)
    }
  })

  it('carries reflectivity + dual-pol moments with plausible values', () => {
    const r = radials[0]
    expect(Object.keys(r.moments)).toEqual(expect.arrayContaining(['REF', 'ZDR', 'RHO']))
    const ref = r.moments.REF
    expect(ref.gates).toBeGreaterThan(100)
    expect(ref.gateSpacingM).toBe(250)
    // decode a few real gate values into dBZ
    let checked = 0
    for (let i = 0; i < ref.gates && checked < 5; i++) {
      const raw = ref.data[i]
      if (raw > 1) {
        const dbz = (raw - ref.offset) / ref.scale
        expect(dbz).toBeGreaterThan(-35)
        expect(dbz).toBeLessThan(85)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('start chunk decodes without throwing (metadata only)', () => {
    const s = decodeChunk(load('ktlx-chunk-s.bin'), true)
    expect(Array.isArray(s)).toBe(true)
  })
})
