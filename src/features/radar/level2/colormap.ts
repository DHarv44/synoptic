/** NWS-convention reflectivity color LUT for the polar shader. */

const REF_STOPS: Array<[number, string]> = [
  [5, '#04e9e7'],
  [10, '#019ff4'],
  [15, '#0300f4'],
  [20, '#02fd02'],
  [25, '#01c501'],
  [30, '#008e00'],
  [35, '#fdf802'],
  [40, '#e5bc00'],
  [45, '#fd9500'],
  [50, '#fd0000'],
  [55, '#d40000'],
  [60, '#bc0000'],
  [65, '#f800fd'],
  [70, '#9854c6'],
  [75, '#fdfdfd'],
]

/**
 * 256×1 RGBA LUT indexed by dBZ mapped over [-32, 95): lut[i] covers
 * dBZ = i/2 − 32. Below 5 dBZ is transparent.
 */
export function reflectivityLut(): Uint8Array {
  const lut = new Uint8Array(256 * 4)
  for (let i = 0; i < 256; i++) {
    const dbz = i / 2 - 32
    let color: string | null = null
    for (const [t, c] of REF_STOPS) {
      if (dbz >= t) color = c
    }
    if (color !== null) {
      lut[i * 4] = parseInt(color.slice(1, 3), 16)
      lut[i * 4 + 1] = parseInt(color.slice(3, 5), 16)
      lut[i * 4 + 2] = parseInt(color.slice(5, 7), 16)
      lut[i * 4 + 3] = 255
    }
  }
  return lut
}
