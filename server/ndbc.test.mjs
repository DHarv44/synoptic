import { describe, expect, it } from 'vitest'
import { parseLatestObs } from './ndbc.mjs'

const SAMPLE = `#STN       LAT      LON  YYYY MM DD hh mm WDIR WSPD   GST WVHT  DPD APD MWD   PRES  PTDY  ATMP  WTMP  DEWP  VIS   TIDE
#text      deg      deg   yr mo day hr mn degT  m/s   m/s   m   sec sec degT   hPa   hPa  degC  degC  degC  nmi     ft
22101    37.24   126.02  2026 08 15 23 00 110   4.0    MM  0.0   0   MM  MM     MM    MM  24.3  25.5    MM   MM     MM
41001    34.70   -72.70  2026 08 15 22 50 210   6.0   8.0  1.5   8 5.4 190 1015.2  -1.1  27.0  28.1  24.0   MM     MM
`

describe('parseLatestObs', () => {
  it('parses rows, MM as null, UTC timestamps', () => {
    const rows = parseLatestObs(SAMPLE)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ id: '22101', lat: 37.24, gst: null, wtmp: 25.5 })
    expect(rows[1]).toMatchObject({ id: '41001', wvht: 1.5, dpd: 8, pres: 1015.2, atmp: 27.0 })
    expect(rows[1].timeMs).toBe(Date.UTC(2026, 7, 15, 22, 50))
  })

  it('ignores headers and short lines', () => {
    expect(parseLatestObs('#STN\nbroken line\n')).toEqual([])
  })
})
