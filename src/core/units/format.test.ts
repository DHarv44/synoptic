import { describe, expect, it } from 'vitest'
import { fmtPrecip, fmtPressure, fmtTemp, fmtWind, fmtWindDir } from '@/core/units/format'

describe('fmtTemp', () => {
  it('converts from Celsius', () => {
    expect(fmtTemp(0, 'C')).toBe('0°C')
    expect(fmtTemp(0, 'F')).toBe('32°F')
    expect(fmtTemp(100, 'F')).toBe('212°F')
    expect(fmtTemp(-40, 'F')).toBe('-40°F')
  })
})

describe('fmtWind', () => {
  it('converts from m/s to each unit', () => {
    // 10 m/s = 36 km/h = 22.4 mph = 19.4 kt.
    expect(fmtWind(10, 'ms')).toBe('10.0 m/s')
    expect(fmtWind(10, 'kmh')).toBe('36 km/h')
    expect(fmtWind(10, 'mph')).toBe('22 mph')
    expect(fmtWind(10, 'kt')).toBe('19 kt')
  })

  it('keeps a decimal for m/s only, where whole numbers are too coarse', () => {
    expect(fmtWind(2.5, 'ms')).toBe('2.5 m/s')
    expect(fmtWind(2.5, 'kt')).toBe('5 kt')
  })
})

describe('fmtPressure', () => {
  it('converts hPa to inches of mercury', () => {
    // Standard sea-level pressure: 1013.25 hPa = 29.92 inHg.
    expect(fmtPressure(1013.25, 'hPa')).toBe('1013.3 hPa')
    expect(fmtPressure(1013.25, 'inHg')).toBe('29.92 inHg')
  })
})

describe('fmtPrecip', () => {
  it('converts mm to inches', () => {
    expect(fmtPrecip(25.4, 'mm')).toBe('25.4 mm')
    expect(fmtPrecip(25.4, 'in')).toBe('1.00 in')
    expect(fmtPrecip(0, 'in')).toBe('0.00 in')
  })
})

describe('fmtWindDir', () => {
  it('bins degrees to the 16-point compass, wrapping at north', () => {
    expect(fmtWindDir(0)).toBe('N')
    expect(fmtWindDir(90)).toBe('E')
    expect(fmtWindDir(180)).toBe('S')
    expect(fmtWindDir(270)).toBe('W')
    // 350° is nearer north than NNW, and must not index past the array.
    expect(fmtWindDir(350)).toBe('N')
    expect(fmtWindDir(360)).toBe('N')
  })
})
