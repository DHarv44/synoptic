import { describe, expect, it } from 'vitest'
import { catmullRom, chaikin, type Pt } from '@/core/geo/smooth'

describe('chaikin', () => {
  it('keeps the endpoints of open lines', () => {
    const line: Pt[] = [
      [0, 0],
      [1, 1],
      [2, 0],
    ]
    const s = chaikin(line, 2)
    expect(s[0]).toEqual([0, 0])
    expect(s[s.length - 1]).toEqual([2, 0])
    expect(s.length).toBeGreaterThan(line.length)
  })

  it('rounds the corner off a right angle', () => {
    const s = chaikin(
      [
        [0, 0],
        [1, 0],
        [1, 1],
      ],
      1,
    )
    // The corner point [1,0] itself is gone; its neighbours remain nearby.
    expect(s.some((p) => p[0] === 1 && p[1] === 0)).toBe(false)
  })

  it('smooths closed rings through the join and keeps them closed', () => {
    const ring: Pt[] = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
      [0, 0],
    ]
    const s = chaikin(ring, 2)
    expect(s[0]).toEqual(s[s.length - 1])
    // No original corner survives on a closed ring.
    expect(s.some((p) => p[0] === 0 && p[1] === 0)).toBe(false)
  })

  it('leaves degenerate lines alone', () => {
    const short: Pt[] = [
      [0, 0],
      [1, 1],
    ]
    expect(chaikin(short)).toEqual(short)
  })
})

describe('catmullRom', () => {
  it('passes through every control point', () => {
    const pts: Pt[] = [
      [0, 0],
      [1, 2],
      [3, 1],
      [4, 3],
    ]
    const s = catmullRom(pts, 4)
    for (const p of pts) {
      expect(s.some((q) => Math.abs(q[0] - p[0]) < 1e-9 && Math.abs(q[1] - p[1]) < 1e-9)).toBe(
        true,
      )
    }
  })

  it('densifies segments', () => {
    const s = catmullRom(
      [
        [0, 0],
        [1, 0],
        [2, 0],
      ],
      8,
    )
    expect(s.length).toBe(1 + 2 * 8)
  })
})
