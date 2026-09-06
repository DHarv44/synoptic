import { describe, expect, it } from 'vitest'
import { RAMP_MAX_MS, WIND_RAMP, windRampCss, windRampGlsl } from '@/features/wind/ramp'

describe('wind ramp', () => {
  it('generates one smoothstep per stop after the first, in order', () => {
    const glsl = windRampGlsl()
    expect(glsl).toContain('vec3 ramp(float s)')
    expect(glsl.match(/smoothstep/g)?.length).toBe(WIND_RAMP.length - 1)
    expect(glsl).toContain('smoothstep(1.00, 4.00, s)')
    expect(glsl).toContain(`smoothstep(36.00, ${RAMP_MAX_MS.toFixed(2)}, s)`)
  })

  it('lays the legend gradient on the same stops', () => {
    const css = windRampCss()
    expect(css.startsWith('linear-gradient(to right,')).toBe(true)
    expect(css.match(/rgb\(/g)?.length).toBe(WIND_RAMP.length)
    expect(css).toContain('100.0%')
  })

  it('keeps the stops monotonic', () => {
    for (let i = 1; i < WIND_RAMP.length; i++) {
      expect(WIND_RAMP[i].upTo).toBeGreaterThan(WIND_RAMP[i - 1].upTo)
    }
  })
})
