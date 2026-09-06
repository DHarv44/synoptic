import { describe, expect, it } from 'vitest'
import { MAX_KM, arrivalAtPoint, distanceToLineKm } from '@/features/tropical/arrival'

const line = (label: string, lonA: number, lonB: number, lat: number): GeoJSON.Feature => ({
  type: 'Feature',
  geometry: { type: 'LineString', coordinates: [[lonA, lat], [lonB, lat]] },
  properties: { arrival_time: label },
})
const labelOf = (f: GeoJSON.Feature): string => String(f.properties?.arrival_time ?? '')

describe('distanceToLineKm', () => {
  it('measures to the nearest point on a segment, not its endpoints', () => {
    // A line along lat 20 from lon −120 to −110; a point 1° south of its middle.
    const d = distanceToLineKm(line('x', -120, -110, 20).geometry, 19, -115)
    expect(d).toBeCloseTo(111.32, 0)
    // Off the end: distance to the endpoint.
    const dEnd = distanceToLineKm(line('x', -120, -110, 20).geometry, 20, -125)
    expect(dEnd).toBeCloseTo(5 * 111.32 * Math.cos((20 * Math.PI) / 180), 0)
  })
})

describe('arrivalAtPoint', () => {
  const likely = [line('Sun 8 pm', -120, -110, 20), line('Mon 8 am', -120, -110, 21), line(' ', -120, -110, 22)]
  const earliest = [line('Sun 2 pm', -120, -110, 20.5)]

  it('picks the nearest labelled most-likely line and the nearest earliest line', () => {
    const a = arrivalAtPoint(likely, earliest, 20.9, -115, labelOf)
    expect(a?.likely).toBe('Mon 8 am')
    expect(a?.earliest).toBe('Sun 2 pm')
    expect(a?.distKm).toBeLessThan(15)
  })

  it('ignores blank labels', () => {
    const a = arrivalAtPoint(likely, [], 22, -115, labelOf)
    expect(a?.likely).toBe('Mon 8 am')
  })

  it('answers nothing outside the drawn area', () => {
    // North of the northernmost LABELLED line (lat 21) by more than the threshold;
    // the blank-labelled line at 22 must not count.
    expect(arrivalAtPoint(likely, earliest, 21 + (MAX_KM + 60) / 111.32, -115, labelOf)).toBeNull()
    expect(arrivalAtPoint([], [], 20, -115, labelOf)).toBeNull()
  })
})
