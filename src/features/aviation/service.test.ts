import { describe, expect, it } from 'vitest'
import {
  activeSigmets,
  pirepGeoJSON,
  pirepSeverity,
  sigmetGeoJSON,
  type AirSigmet,
  type Pirep,
} from '@/features/aviation/service'

const NOW = Date.parse('2026-08-15T21:00:00Z')

function sigmet(over: Partial<AirSigmet> = {}): AirSigmet {
  return {
    airSigmetType: 'SIGMET',
    hazard: 'CONVECTIVE',
    validTimeFrom: NOW / 1000 - 600,
    validTimeTo: NOW / 1000 + 3600,
    altitudeHi1: 44000,
    altitudeLow1: null,
    movementDir: 210,
    movementSpd: 20,
    rawAirSigmet: 'CONVECTIVE SIGMET 05W',
    coords: [
      { lat: 40, lon: -100 },
      { lat: 41, lon: -99 },
      { lat: 40, lon: -98 },
    ],
    ...over,
  }
}

function pirep(over: Partial<Pirep> = {}): Pirep {
  return {
    lat: 38,
    lon: -85,
    obsTime: NOW / 1000,
    acType: 'B737',
    fltLvl: '360',
    pirepType: 'PIREP',
    icgInt1: '',
    tbInt1: '',
    rawOb: '',
    ...over,
  }
}

describe('activeSigmets', () => {
  it('keeps only currently valid products with a drawable polygon', () => {
    const items = [
      sigmet(),
      sigmet({ validTimeTo: NOW / 1000 - 60 }), // expired
      sigmet({ validTimeFrom: NOW / 1000 + 600 }), // not yet in effect
      sigmet({ coords: [{ lat: 40, lon: -100 }] }), // too few points
      sigmet({ coords: null }),
    ]
    expect(activeSigmets(items, NOW)).toHaveLength(1)
  })
})

describe('sigmetGeoJSON', () => {
  it('closes the ring — AWC polygons are not explicitly closed', () => {
    const geo = sigmetGeoJSON([sigmet()])
    const ring = (geo.features[0].geometry as GeoJSON.Polygon).coordinates[0]
    expect(ring).toHaveLength(4)
    expect(ring[0]).toEqual(ring[3])
  })
})

describe('pirepSeverity', () => {
  it('reads the worst of icing and turbulence, upper bound of ranges', () => {
    expect(pirepSeverity(pirep())).toBe(0)
    expect(pirepSeverity(pirep({ tbInt1: 'LGT' }))).toBe(1)
    expect(pirepSeverity(pirep({ tbInt1: 'LGT-MOD' }))).toBe(2)
    expect(pirepSeverity(pirep({ icgInt1: 'MOD', tbInt1: 'LGT' }))).toBe(2)
    expect(pirepSeverity(pirep({ icgInt1: 'SEV' }))).toBe(3)
  })

  it('treats an urgent PIREP as severe regardless of parsed fields', () => {
    expect(pirepSeverity(pirep({ pirepType: 'Urgent PIREP' }))).toBe(3)
  })

  it('copes with the null intensity fields AWC actually sends', () => {
    expect(pirepSeverity(pirep({ icgInt1: null as unknown as string }))).toBe(0)
  })
})

describe('pirepGeoJSON', () => {
  it('drops reports without a position instead of drawing them at [0,0]', () => {
    const geo = pirepGeoJSON([pirep(), pirep({ lat: NaN })])
    expect(geo.features).toHaveLength(1)
  })
})
