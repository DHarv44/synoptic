import { describe, expect, it } from 'vitest'
import { clearZeroPrecip, precipUrl } from '@/features/precip/protocol'

describe('clearZeroPrecip', () => {
  it('clears only the zero-accumulation grey, leaving values and transparency alone', () => {
    const px = new Uint8ClampedArray([
      144, 144, 144, 255, // zero → cleared
      0, 12, 255, 255, // a light-blue value → kept
      0, 0, 0, 0, // already transparent → untouched
      144, 144, 145, 255, // not the exact grey → kept
    ])
    clearZeroPrecip(px)
    expect(Array.from(px)).toEqual([
      144, 144, 144, 0,
      0, 12, 255, 255,
      0, 0, 0, 0,
      144, 144, 145, 255,
    ])
  })
})

describe('precipUrl', () => {
  it('wraps the upstream template in the protocol', () => {
    expect(precipUrl('https://x/{z}/{x}/{y}.png')).toBe('synoptic-precip://https://x/{z}/{x}/{y}.png')
  })
})
