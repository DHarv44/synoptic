import { describe, expect, it } from 'vitest'
import { gaugeGeoJSON, gaugesUrl, reportingGauges, type Gauge } from '@/features/gauges/service'

function gauge(lid: string, floodCategory: string, primary = 3.2): Gauge {
  return {
    lid,
    name: lid,
    latitude: 35,
    longitude: -97,
    status: {
      observed: { primary, primaryUnit: 'ft', floodCategory, validTime: '2026-08-15T12:00:00Z' },
    },
  }
}

describe('gaugesUrl', () => {
  it('includes the mandatory srid', () => {
    expect(gaugesUrl(34, -98, 36, -96)).toContain('srid=EPSG_4326')
  })
})

describe('reportingGauges', () => {
  const gauges = [
    gauge('A', 'no_flooding'),
    gauge('B', 'minor'),
    gauge('C', 'obs_not_current'),
    gauge('D', 'not_defined'),
    gauge('E', 'no_flooding', -999), // sentinel: no current stage
    { lid: 'F', name: 'F', latitude: 35, longitude: -97 }, // no status at all
  ]

  it('keeps only gauges with a current observation in a known category', () => {
    expect(reportingGauges(gauges, false).map((g) => g.lid)).toEqual(['A', 'B'])
  })

  it('floodingOnly drops gauges below action stage', () => {
    expect(reportingGauges(gauges, true).map((g) => g.lid)).toEqual(['B'])
  })
})

describe('gaugeGeoJSON', () => {
  it('ranks and labels stages', () => {
    const fc = gaugeGeoJSON([gauge('B', 'major')])
    const props = fc.features[0].properties as { rank: number; stage: string }
    expect(props.rank).toBe(4)
    expect(props.stage).toBe('3.2 ft')
  })
})
