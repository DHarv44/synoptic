import { describe, expect, it } from 'vitest'
import { SKEWT, xOfTP, yOfP } from '@/features/sounding/skewTScales'

describe('skew-T scales', () => {
  it('puts the surface at the bottom and the top of the atmosphere at the top', () => {
    // Regression: the diagram shipped vertically mirrored for a while.
    expect(yOfP(SKEWT.P_BOT)).toBeGreaterThan(yOfP(SKEWT.P_TOP))
    expect(yOfP(SKEWT.P_TOP)).toBeCloseTo(SKEWT.MT, 6)
    expect(yOfP(SKEWT.P_BOT)).toBeCloseTo(SKEWT.H - SKEWT.MB, 6)
  })

  it('skews isotherms rightward with height', () => {
    expect(xOfTP(0, 500)).toBeGreaterThan(xOfTP(0, SKEWT.P_BOT))
  })
})
