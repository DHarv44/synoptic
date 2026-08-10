import { describe, expect, it } from 'vitest'
import {
  lclPressure,
  lclTemperatureK,
  liftParcel,
  mixingRatio,
  precipitableWater,
  satVaporPressure,
  surfaceCape,
} from '@/core/met/thermo'
import { dewpointFromRh } from '@/core/data/openMeteo/sounding'
import { bulkShear, toUV } from '@/core/met/kinematics'

describe('moist thermodynamics reference values', () => {
  it('saturation vapor pressure matches Bolton reference', () => {
    expect(satVaporPressure(0)).toBeCloseTo(6.112, 2)
    expect(satVaporPressure(20)).toBeCloseTo(23.37, 1)
    expect(satVaporPressure(30)).toBeCloseTo(42.43, 1)
  })

  it('mixing ratio at 25°C/1000hPa ≈ 20 g/kg', () => {
    expect(mixingRatio(25, 1000) * 1000).toBeCloseTo(20.1, 0)
  })

  it('dewpoint from RH inverts at saturation', () => {
    expect(dewpointFromRh(22, 100)).toBeCloseTo(22, 1)
    expect(dewpointFromRh(30, 50)).toBeCloseTo(18.4, 0)
  })

  it('LCL for T=30/Td=20 at 1000hPa near 850–870 hPa (~1.3 km)', () => {
    const tLcl = lclTemperatureK(30, 20) - 273.15
    expect(tLcl).toBeGreaterThan(16)
    expect(tLcl).toBeLessThan(20)
    const pLcl = lclPressure(30, 20, 1000)
    expect(pLcl).toBeGreaterThan(840)
    expect(pLcl).toBeLessThan(880)
  })

  it('dry lift cools ~9.8°C per 100 hPa near the surface', () => {
    const { temps } = liftParcel(30, -40, 1000, [900])
    expect(30 - temps[0]).toBeGreaterThan(7.5)
    expect(30 - temps[0]).toBeLessThan(9.5)
  })

  it('moist ascent cools slower than dry ascent', () => {
    const dry = liftParcel(30, -40, 1000, [700]).temps[0]
    const moist = liftParcel(30, 29, 1000, [700]).temps[0]
    expect(moist).toBeGreaterThan(dry + 5)
  })
})

describe('CAPE on constructed profiles', () => {
  const P = [1000, 925, 850, 700, 500, 300, 200]

  it('isothermal profile is stable (zero CAPE, negative CIN path)', () => {
    const T = [20, 20, 20, 20, 20, 20, 20]
    const r = surfaceCape(P, T, 20, 10)
    expect(r.cape).toBe(0)
    expect(r.lfcP).toBeNull()
  })

  it('steep-lapse moist surface parcel produces large CAPE', () => {
    // classic loaded-gun-ish: warm/moist surface, ~7.5°C/km lapse aloft
    const T = [30, 24, 19, 8, -12, -40, -55]
    const r = surfaceCape(P, T, 30, 23)
    expect(r.cape).toBeGreaterThan(1500)
    expect(r.cape).toBeLessThan(5000)
    expect(r.lfcP).not.toBeNull()
    expect(r.liftedIndex).toBeLessThan(-4)
  })
})

describe('kinematics', () => {
  it('toUV: north wind blows toward the south (v negative)', () => {
    const w = toUV(10, 0)
    expect(w.u).toBeCloseTo(0, 6)
    expect(w.v).toBeCloseTo(-10, 6)
  })

  it('bulk shear across a veering profile', () => {
    const levels = [
      { p: 1000, T: 25, Td: 20, ws: 5, wd: 180, z: 100 },
      { p: 850, T: 15, Td: 10, ws: 15, wd: 225, z: 1500 },
      { p: 700, T: 5, Td: -5, ws: 25, wd: 270, z: 3100 },
      { p: 500, T: -10, Td: -25, ws: 30, wd: 280, z: 5800 },
    ]
    const shear6 = bulkShear(levels, 6000)
    expect(shear6).toBeGreaterThan(20)
  })
})

describe('precipitable water', () => {
  it('moist column yields tens of mm', () => {
    const P = [1000, 850, 700, 500, 300]
    const Td = [22, 15, 5, -15, -40]
    const pw = precipitableWater(P, Td)
    expect(pw).toBeGreaterThan(25)
    expect(pw).toBeLessThan(70)
  })
})
