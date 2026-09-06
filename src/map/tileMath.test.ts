import { describe, expect, it } from 'vitest'
import { coveringTiles } from '@/map/tileMath'

describe('coveringTiles', () => {
  it('covers the whole world with the single z0 tile', () => {
    expect(coveringTiles(-180, -85, 180, 85, 0)).toEqual([{ z: 0, x: 0, y: 0 }])
  })

  it('names the classic CONUS tiles at z4', () => {
    // Kansas-ish viewport: lon −105..−90, lat 32..45.
    const tiles = coveringTiles(-105, 32, -90, 45, 4)
    expect(tiles).toContainEqual({ z: 4, x: 3, y: 6 })
    expect(tiles.every((t) => t.x >= 3 && t.x <= 4 && t.y >= 5 && t.y <= 6)).toBe(true)
  })

  it('clamps polar latitudes instead of running off the pyramid', () => {
    const tiles = coveringTiles(-10, 80, 10, 89.9, 3)
    expect(tiles.every((t) => t.y >= 0)).toBe(true)
  })

  it('caps the tile count', () => {
    expect(coveringTiles(-180, -85, 180, 85, 8).length).toBeLessThanOrEqual(48)
  })
})
