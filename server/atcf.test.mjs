import { describe, expect, it } from 'vitest'
import { atcfCoord, extractPre, parseADeck, parseAtcfLine, parseBDeck } from './atcf.mjs'

const B = [
  'EP, 13, 2026090600,   , BEST,   0, 225N, 1210W,  75,  975, HU,  34, NEQ,   80,   60,   60,   70',
  'EP, 13, 2026090600,   , BEST,   0, 225N, 1210W,  75,  975, HU,  50, NEQ,   40,   30,   30,   40',
  'EP, 13, 2026090606,   , BEST,   0, 229N, 1217W,  80,  971, HU,  34, NEQ,   80,   60,   60,   70',
  'EP, 13, 2026082918,   , BEST,   0, 104N, 1053W,  20,    0, DB,   0',
].join('\n')

const A = [
  'EP, 13, 2026090600, 03, OFCL,   0, 225N, 1210W,  75,    0, HU',
  'EP, 13, 2026090606, 03, OFCL,   0, 229N, 1217W,  80,    0, HU',
  'EP, 13, 2026090606, 03, OFCL,  12, 240N, 1230W,  70,    0, HU',
  'EP, 13, 2026090606, 03, OFCL,  12, 240N, 1230W,  70,    0, HU',
  'EP, 13, 2026090606, 03, AVNI,   0, 229N, 1217W,  78,    0, XX',
  'EP, 13, 2026090606, 03, AVNI,  24, 255N, 1250W,  60,    0, XX',
  'EP, 13, 2026090606, 03, CARQ,   0, 229N, 1217W,  80,    0, HU',
  'EP, 13, 2026090606, 03, HWFI,   0, 229N, 1217W,  80,    0, HU',
].join('\n')

describe('atcfCoord', () => {
  it('reads tenths with hemisphere signs', () => {
    expect(atcfCoord('229N')).toBe(22.9)
    expect(atcfCoord('1217W')).toBe(-121.7)
    expect(atcfCoord('x')).toBeNull()
  })
})

describe('parseAtcfLine', () => {
  it('maps the leading fields and treats 0 mslp as missing', () => {
    const r = parseAtcfLine(B.split('\n')[3])
    expect(r).toMatchObject({ basin: 'EP', num: 13, dtg: '2026082918', tech: 'BEST', vmax: 20, mslp: null, ty: 'DB' })
  })
})

describe('parseBDeck', () => {
  it('collapses radii rows to one point per time, oldest first', () => {
    const pts = parseBDeck(B)
    expect(pts.map((p) => p.vmax)).toEqual([20, 75, 80])
    expect(pts[2]).toMatchObject({ lat: 22.9, lon: -121.7, mslp: 971, ty: 'HU' })
    expect(pts[0].t).toBe(Date.UTC(2026, 7, 29, 18))
  })
})

describe('parseADeck', () => {
  it('keeps only the latest run and the curated models, one point per hour', () => {
    const d = parseADeck(A)
    expect(d.dtg).toBe('2026090606')
    expect(d.runMs).toBe(Date.UTC(2026, 8, 6, 6))
    expect(d.models.map((m) => m.tech).sort()).toEqual(['AVNI', 'OFCL'])
    const ofcl = d.models.find((m) => m.tech === 'OFCL')
    expect(ofcl?.label).toBe('NHC official')
    expect(ofcl?.points.map((p) => p.tau)).toEqual([0, 12])
    // HWFI had a single point and CARQ is not curated: neither is a track.
    expect(d.models.some((m) => m.tech === 'HWFI' || m.tech === 'CARQ')).toBe(false)
  })
})

describe('extractPre', () => {
  it('pulls the text block and decodes entities', () => {
    expect(extractPre('<html><pre class="x">\nA &amp; B\n</pre></html>')).toBe('A & B')
    expect(extractPre('<html>no</html>')).toBeNull()
  })
})
