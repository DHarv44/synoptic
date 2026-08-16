import { describe, expect, it } from 'vitest'
import { parseCodsus } from '@/core/data/wpc/codsus'

/** Head of a real ASUS02 bulletin, 2026-08-15 21Z — wrapped lines and all. */
const REAL = `
558
ASUS02 KWBC 152100
CODSUS

CODED SURFACE FRONTAL POSITIONS
NWS WEATHER PREDICTION CENTER COLLEGE PARK MD
618 PM EDT SAT AUG 15 2026

VALID 081521Z
HIGHS 1021 2750872 1019 3460871 1021 4040709 1023 4590771 1021 4010786 1023
7321273 1019 6791484
LOWS 1018 3490778 1004 4710519 1002
6350605
STNRY 3470717 3500726 3510738 3480758 3480769 3490778
COLD 3380670 3370684 3410703 3460717
WARM 4210910 4190888 4150869
TROF 3390775 3330787 3290802
OCFNT 5020956 4950949 4830945
`

describe('parseCodsus', () => {
  const parsed = parseCodsus(REAL)

  it('reads the valid time', () => {
    expect(parsed.validTime).toBe('081521Z')
  })

  it('decodes 7-digit coordinates as lat×10 / west-lon×10', () => {
    const first = parsed.centers[0]
    expect(first).toEqual({ kind: 'high', pressure: 1021, lat: 27.5, lon: -87.2 })
  })

  it('follows centers across wrapped lines', () => {
    // 1023 pairs with 7321273 on the next physical line.
    expect(parsed.centers).toContainEqual({
      kind: 'high',
      pressure: 1023,
      lat: 73.2,
      lon: -127.3,
    })
    // 1002 pairs with 6350605 likewise.
    expect(parsed.centers).toContainEqual({
      kind: 'low',
      pressure: 1002,
      lat: 63.5,
      lon: -60.5,
    })
  })

  it('collects every front with its kind', () => {
    expect(parsed.fronts.map((f) => f.kind)).toEqual([
      'stationary',
      'cold',
      'warm',
      'trough',
      'occluded',
    ])
    expect(parsed.fronts[1].points).toHaveLength(4)
    expect(parsed.fronts[1].points[0]).toEqual({ lat: 33.8, lon: -67.0 })
  })

  it('reads a strength grade when the bulletin carries one', () => {
    const graded = parseCodsus('COLD WK 3380670 3370684')
    expect(graded.fronts[0]).toMatchObject({ kind: 'cold', strength: 'WK' })
  })

  it('decodes the overnight ASUS01 whole-degree format', () => {
    // Real bulletin head, 2026-08-16 04:26Z: 4-5 digit points, same pil.
    const asus01 = [
      'HIGHS 1021 38112 1019 35105 1024 4474 1021 2988',
      'LOWS 1013 5093 1009 34115',
      'COLD 4693 4594 4396 4299 42101',
      'TROF 41108 39108 38106',
    ].join('\n')
    const a = parseCodsus(asus01)
    expect(a.centers).toHaveLength(6)
    expect(a.centers[0]).toMatchObject({ kind: 'high', pressure: 1021, lat: 38, lon: -112 })
    expect(a.centers[2]).toMatchObject({ pressure: 1024, lat: 44, lon: -74 })
    expect(a.centers[3]).toMatchObject({ pressure: 1021, lat: 29, lon: -88 })
    const cold = a.fronts.find((f) => f.kind === 'cold')
    expect(cold?.points[4]).toEqual({ lat: 42, lon: -101 })
    expect(a.fronts.find((f) => f.kind === 'trough')?.points).toHaveLength(3)
  })

  it('drops one-point fronts rather than drawing dots', () => {
    expect(parseCodsus('COLD 3380670').fronts).toHaveLength(0)
  })

  it('survives an empty or garbage input', () => {
    expect(parseCodsus('')).toEqual({ validTime: null, fronts: [], centers: [] })
    expect(parseCodsus('NO SUCH PRODUCT').fronts).toHaveLength(0)
  })
})
