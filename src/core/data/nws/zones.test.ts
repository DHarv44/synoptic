import { describe, expect, it } from 'vitest'
import { polygonsOf, unionZones, zoneKey } from '@/core/data/nws/zones'
import { alertBbox, withGeometry, type AlertFeature } from '@/core/data/nws/alerts'

const square = (x: number): GeoJSON.Polygon => ({
  type: 'Polygon',
  coordinates: [
    [
      [x, 0],
      [x + 1, 0],
      [x + 1, 1],
      [x, 1],
      [x, 0],
    ],
  ],
})

describe('zoneKey', () => {
  it('extracts type and id from the API url', () => {
    expect(zoneKey('https://api.weather.gov/zones/forecast/TXZ213')).toBe('forecast/TXZ213')
    expect(zoneKey('https://api.weather.gov/zones/county/TXC201/')).toBe('county/TXC201')
    expect(zoneKey('https://api.weather.gov/alerts/x')).toBeNull()
  })
})

describe('polygonsOf / unionZones', () => {
  it('flattens polygons, multipolygons and nested collections', () => {
    const multi: GeoJSON.MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [square(2).coordinates, square(4).coordinates],
    }
    const coll: GeoJSON.GeometryCollection = {
      type: 'GeometryCollection',
      geometries: [square(6), { type: 'Point', coordinates: [0, 0] }],
    }
    const u = unionZones([square(0), multi, coll])
    expect(u.type).toBe('GeometryCollection')
    expect(u.geometries).toHaveLength(4)
    expect(u.geometries.every((g) => g.type === 'Polygon')).toBe(true)
    expect(polygonsOf({ type: 'LineString', coordinates: [] })).toEqual([])
  })
})

describe('alerts with resolved zone geometry', () => {
  const alert = (geometry: GeoJSON.Geometry | null): AlertFeature => ({
    id: 'a',
    geometry,
    properties: { event: 'Winter Storm Warning', severity: 'Severe', areaDesc: '', expires: '' },
  })

  it('a resolved collection is mapped and has a bbox', () => {
    const a = alert(unionZones([square(0), square(5)]))
    expect(withGeometry([a])).toHaveLength(1)
    expect(alertBbox(a)).toEqual([0, 0, 6, 1])
  })

  it('an unresolved zone alert is still unmapped', () => {
    const a = alert(null)
    expect(withGeometry([a])).toHaveLength(0)
    expect(alertBbox(a)).toBeNull()
  })
})
