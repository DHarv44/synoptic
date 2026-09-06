import { describe, expect, it } from 'vitest'
import { clampHeight, snapHeights, snapTarget } from '@/app/shell/sheetSnap'

const VH = 800
const H = snapHeights(VH)

describe('snapHeights', () => {
  it('matches the CSS detents for the viewport', () => {
    expect(H).toEqual({ peek: 56, half: 432, full: 756 })
  })

  it('never lets full drop below peek on a tiny viewport', () => {
    expect(snapHeights(80).full).toBe(56)
  })
})

describe('clampHeight', () => {
  it('keeps a drag between the tab bar and the top bar', () => {
    expect(clampHeight(-40, VH)).toBe(56)
    expect(clampHeight(300, VH)).toBe(300)
    expect(clampHeight(5000, VH)).toBe(756)
  })
})

describe('snapTarget', () => {
  it('settles on the nearest detent for a slow release', () => {
    expect(snapTarget(100, 0, VH)).toBe('peek')
    expect(snapTarget(400, 0.1, VH)).toBe('half')
    expect(snapTarget(700, -0.1, VH)).toBe('full')
  })

  it('a flick up from around half goes to full even if the sheet is just above it', () => {
    expect(snapTarget(H.half + 10, 1.2, VH)).toBe('full')
    expect(snapTarget(H.half - 10, 1.2, VH)).toBe('full')
  })

  it('a flick down from around half goes to peek', () => {
    expect(snapTarget(H.half + 10, -1.2, VH)).toBe('peek')
    expect(snapTarget(H.half - 10, -1.2, VH)).toBe('peek')
  })

  it('a flick down from well above half stops at half', () => {
    expect(snapTarget(H.half + 150, -1.2, VH)).toBe('half')
  })

  it('a flick up from just above peek stops at half', () => {
    expect(snapTarget(H.peek + 60, 1.2, VH)).toBe('half')
  })

  it('flicks at the ends stay at the ends', () => {
    expect(snapTarget(H.full, 2, VH)).toBe('full')
    expect(snapTarget(H.peek, -2, VH)).toBe('peek')
  })
})
