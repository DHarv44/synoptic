import { describe, expect, it } from 'vitest'
import { inBbox, parseBbox, parseCurrents, parseTiers } from './iemObs.mjs'

const feature = (props, lon = -93.2, lat = 30.1) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [lon, lat] },
  properties: {
    station: 'LA010',
    name: 'I-10 @ Atchafalaya',
    network: 'LA_RWIS',
    utc_valid: '2026-09-06T10:40:00Z',
    tmpf: 87.08,
    dwpf: 75.92,
    drct: 150,
    sknt: 6.4,
    gust: 10.6,
    mslp: 1018.64,
    wxcodes: null,
    skyc1: null,
    ...props,
  },
})

describe('parseCurrents', () => {
  it('maps IEM fields to the METAR record shape in °C, kt and hPa', () => {
    const [s] = parseCurrents({ features: [feature({})] }, 'road')
    expect(s).toMatchObject({
      icaoId: 'LA010',
      kind: 'road',
      network: 'LA_RWIS',
      lat: 30.1,
      lon: -93.2,
      temp: 30.6,
      dewp: 24.4,
      wdir: 150,
      wspd: 6,
      gust: 11,
      mslp: 1018.6,
      wx: null,
      sky: null,
      fltCat: null,
      rawOb: '',
    })
    expect(s.obsTime).toBe(Date.parse('2026-09-06T10:40:00Z') / 1000)
  })

  it('drops stations with nothing to plot and keeps ones with only wind', () => {
    const out = parseCurrents(
      {
        features: [
          feature({ tmpf: null, sknt: null }),
          feature({ tmpf: null, sknt: 12, station: 'WINDY' }),
        ],
      },
      'synop',
    )
    expect(out.map((s) => s.icaoId)).toEqual(['WINDY'])
    expect(out[0].temp).toBeNull()
  })

  it('drops records without a usable time or position', () => {
    const bad = feature({ utc_valid: 'never' })
    const noGeom = { ...feature({}), geometry: null }
    expect(parseCurrents({ features: [bad, noGeom] }, 'road')).toEqual([])
  })

  it('trims weather and sky text, empty to null', () => {
    const [s] = parseCurrents({ features: [feature({ wxcodes: ' TS ', skyc1: '' })] }, 'synop')
    expect(s.wx).toBe('TS')
    expect(s.sky).toBeNull()
  })
})

describe('bbox and tiers', () => {
  it('parses the METAR bbox order and rejects junk', () => {
    expect(parseBbox('24.0,-100.5,38.0,-80.5')).toEqual([24, -100.5, 38, -80.5])
    expect(parseBbox('24,-100')).toBeNull()
    expect(parseBbox(undefined)).toBeNull()
  })

  it('filters by bbox', () => {
    const box = [24, -100, 38, -80]
    expect(inBbox({ lat: 30, lon: -93 }, box)).toBe(true)
    expect(inBbox({ lat: 40, lon: -93 }, box)).toBe(false)
    expect(inBbox({ lat: 30, lon: -70 }, box)).toBe(false)
  })

  it('keeps only known tiers', () => {
    expect(parseTiers('road,synop,asos, ')).toEqual(['road', 'synop'])
    expect(parseTiers(null)).toEqual([])
  })
})
