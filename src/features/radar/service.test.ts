import { describe, expect, it } from 'vitest'
import { pickFrame, type RadarFrame } from '@/features/radar/service'
import { iemProduct } from '@/features/radar/iem'

const frames: RadarFrame[] = [
  { time: 1000, path: '/a' },
  { time: 1600, path: '/b' },
  { time: 2200, path: '/c' },
]

describe('pickFrame', () => {
  it('picks the latest frame at or before sim time', () => {
    expect(pickFrame(frames, 1700_000)?.path).toBe('/b')
  })
  it('clamps to the first frame before the range', () => {
    expect(pickFrame(frames, 0)?.path).toBe('/a')
  })
  it('clamps to the last frame after the range', () => {
    expect(pickFrame(frames, 9999_000)?.path).toBe('/c')
  })
  it('returns null for no frames', () => {
    expect(pickFrame([], 1000)).toBeNull()
  })
})

describe('iemProduct', () => {
  const now = 10_000_000
  it('uses the current product near now', () => {
    expect(iemProduct(now - 60_000, now)).toBe('nexrad-n0q-900913')
  })
  it('steps back in 5-minute archive products', () => {
    expect(iemProduct(now - 10 * 60_000, now)).toBe('nexrad-n0q-900913-m10m')
  })
  it('pads single-digit steps', () => {
    expect(iemProduct(now - 4 * 60_000, now)).toBe('nexrad-n0q-900913-m05m')
  })
  it('returns null beyond 50 minutes', () => {
    expect(iemProduct(now - 60 * 60_000, now)).toBeNull()
  })
})
