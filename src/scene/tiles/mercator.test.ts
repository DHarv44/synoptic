import { describe, expect, it } from 'vitest'
import { lonLatToTile, tileCenter, tileFracToLonLat } from '@/scene/tiles/mercator'

describe('mercator tile math', () => {
  it('round-trips the origin at z=2', () => {
    const t = lonLatToTile(0, 0, 2)
    expect(t).toMatchObject({ x: 2, y: 2 }) // 0,0 falls in the SE-of-center tile
    const nw = tileFracToLonLat(2, t.x, t.y)
    expect(nw.lon).toBeCloseTo(0, 6)
    expect(nw.lat).toBeCloseTo(0, 6)
  })

  it('maps known city into the right z=4 tile (London)', () => {
    // Reference values from the OSM slippy-map spec
    const t = lonLatToTile(-0.1278, 51.5074, 4)
    expect(t).toMatchObject({ x: 7, y: 5 })
  })

  it('inverse mercator hits the clamp latitude at yFrac=0', () => {
    const { lat } = tileFracToLonLat(0, 0, 0)
    expect(lat).toBeCloseTo(85.0511287798, 4)
  })

  it('tile centers stay within bounds', () => {
    const c = tileCenter({ z: 3, x: 0, y: 0 })
    expect(c.lon).toBeLessThan(0)
    expect(c.lat).toBeGreaterThan(66)
  })
})
