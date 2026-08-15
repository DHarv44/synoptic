import { describe, expect, it } from 'vitest'
import { alertsAtPoint, meetsSeverity, pointInPolygon } from '@/features/notify/service'
import type { AlertFeature } from '@/core/data/nws/alerts'

/** Unit square with an optional square hole in the middle. */
const square = [
  [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ],
]
const hole = [
  [
    [4, 4],
    [6, 4],
    [6, 6],
    [4, 6],
    [4, 4],
  ],
]

describe('pointInPolygon', () => {
  it('accepts interior points and rejects exterior ones', () => {
    expect(pointInPolygon(square, 5, 5)).toBe(true)
    expect(pointInPolygon(square, 15, 5)).toBe(false)
    expect(pointInPolygon(square, -1, 5)).toBe(false)
    expect(pointInPolygon(square, 5, 11)).toBe(false)
  })

  it('treats later rings as holes', () => {
    const withHole = [...square, ...hole]
    expect(pointInPolygon(withHole, 5, 5)).toBe(false) // inside the hole
    expect(pointInPolygon(withHole, 2, 2)).toBe(true) // inside, outside the hole
  })

  it('does not double-count a vertex at the point latitude', () => {
    // A ray through a shared vertex must cross once, not twice — the classic
    // way this algorithm reports a point outside a polygon it is inside.
    const diamond = [
      [
        [0, 5],
        [5, 0],
        [10, 5],
        [5, 10],
        [0, 5],
      ],
    ]
    expect(pointInPolygon(diamond, 5, 5)).toBe(true)
    expect(pointInPolygon(diamond, 0.5, 5)).toBe(true)
    expect(pointInPolygon(diamond, -0.5, 5)).toBe(false)
  })

  it('handles an empty ring list', () => {
    expect(pointInPolygon([], 0, 0)).toBe(false)
  })
})

describe('meetsSeverity', () => {
  it('passes anything at or above the threshold', () => {
    expect(meetsSeverity('Extreme', 'Severe')).toBe(true)
    expect(meetsSeverity('Severe', 'Severe')).toBe(true)
    expect(meetsSeverity('Moderate', 'Severe')).toBe(false)
    expect(meetsSeverity('Unknown', 'Minor')).toBe(false)
    expect(meetsSeverity('Moderate', 'Minor')).toBe(true)
  })
})

describe('alertsAtPoint', () => {
  const alert = (id: string, coords: number[][][] | null): AlertFeature => ({
    id,
    geometry: coords ? { type: 'Polygon', coordinates: coords } : null,
    properties: {
      event: 'Tornado Warning',
      severity: 'Extreme',
      areaDesc: 'somewhere',
      expires: '2026-08-11T18:00:00Z',
    },
  })

  it('keeps only alerts whose polygon covers the point', () => {
    const found = alertsAtPoint(
      [alert('a', square), alert('b', [[[20, 20], [30, 20], [30, 30], [20, 30], [20, 20]]])],
      { lat: 5, lon: 5 },
    )
    expect(found.map((f) => f.id)).toEqual(['a'])
  })

  it('skips zone-referenced alerts that carry no polygon', () => {
    expect(alertsAtPoint([alert('a', null)], { lat: 5, lon: 5 })).toEqual([])
  })
})
