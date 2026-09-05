import { describe, expect, it } from 'vitest'
import { decodeVaaCoord, parseVaa } from '@/features/volcanoes/vaa'

/** Head of the real Darwin Krakatau bulletin, 2026-09-05 16:30Z. */
const KRAKATAU = `FVAU04 ADRM 051630
VA ADVISORY
DTG: 20260905/1630Z
VAAC: DARWIN
VOLCANO: KRAKATAU 262000
PSN: S0606 E10525
AREA: INDONESIA
SOURCE ELEV: 155M AMSL
ADVISORY NR: 2026/179
INFO SOURCE: HIMAWARI-9 CVGHM
ERUPTION DETAILS: VA TO FL500 MOV W, VA TO FL200 MOV S TO SE
OBS VA DTG: 05/1610Z
OBS VA CLD: SFC/FL200 S0519 E10710 - S0639 E10930 - S0902
        E10829 - S0933 E10514 - S0738 E10138 MOV SE 10KT SFC/FL500
        S0711 E10611 - S1007 E09930 - S1547 E09446 - S1128 E08348 -
        S0311 E09128 - S0142 E10116 - S0517 E10715 MOV W 30KT
FCST VA CLD +6 HR: 05/2210Z SFC/FL200 S0504 E10702 - S0655
        E11008 - S0907 E10859 - S0959 E10507 - S0726 E10141
        SFC/FL500 S0659 E10614 - S1029 E09932 - S1727 E09513 - S1210
        E08104 - S0252 E09040 - S0003 E09932 - S0504 E10704
RMK: CONTINUOUS VA TO FL500 IDENTIFIABLE ON SAT IMAGE MOV W.
NXT ADVISORY: NO LATER THAN 20260905/1830Z=`

describe('decodeVaaCoord', () => {
  it('decodes degrees+minutes with hemisphere signs', () => {
    expect(decodeVaaCoord('S0806')).toBeCloseTo(-8.1, 4)
    expect(decodeVaaCoord('E11255')).toBeCloseTo(112.9167, 3)
    expect(decodeVaaCoord('N0028')).toBeCloseTo(0.4667, 3)
    expect(decodeVaaCoord('W17015')).toBeCloseTo(-170.25, 4)
    expect(decodeVaaCoord('FL500')).toBeNull()
  })
})

describe('parseVaa', () => {
  const adv = parseVaa(KRAKATAU)
  if (!adv) throw new Error('parse returned null')

  it('reads the header: volcano, number, position, time', () => {
    expect(adv.volcanoName).toBe('KRAKATAU')
    expect(adv.volcanoNumber).toBe(262000)
    expect(adv.vaac).toBe('DARWIN')
    expect(adv.position?.lat).toBeCloseTo(-6.1, 3)
    expect(adv.position?.lon).toBeCloseTo(105.4167, 3)
    expect(adv.issuedMs).toBe(Date.UTC(2026, 8, 5, 16, 30))
  })

  it('stacked flight-level polygons split correctly within one section', () => {
    const obs = adv.timesteps.find((t) => t.step === 'OBS')
    expect(obs?.polygons).toHaveLength(2)
    expect(obs?.polygons[0].levels).toBe('SFC/FL200')
    expect(obs?.polygons[0].points).toHaveLength(5)
    expect(obs?.polygons[0].movement).toBe('SE 10KT')
    expect(obs?.polygons[1].levels).toBe('SFC/FL500')
    expect(obs?.polygons[1].points).toHaveLength(7)
    expect(obs?.polygons[1].movement).toBe('W 30KT')
  })

  it('reads forecast steps and wrapped coordinate lists', () => {
    const f6 = adv.timesteps.find((t) => t.step === '+6')
    expect(f6?.polygons).toHaveLength(2)
    // First +6h point: S0504 E10702 → −5.0667, 107.0333
    expect(f6?.polygons[0].points[0].lat).toBeCloseTo(-5.0667, 3)
    expect(f6?.polygons[0].points[0].lon).toBeCloseTo(107.0333, 3)
  })

  it('rejects non-advisory text', () => {
    expect(parseVaa('THE QUICK BROWN FOX')).toBeNull()
    expect(parseVaa('VA ADVISORY\nDTG: junk')).toBeNull()
  })
})
