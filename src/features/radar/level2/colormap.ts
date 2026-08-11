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

/** CSS color for a dBZ value (CPU twin of the shader LUT); null below 5 dBZ. */
export function dbzToCss(dbz: number): string | null {
  let color: string | null = null
  for (const [t, c] of REF_STOPS) {
    if (dbz >= t) color = c
  }
  return color
}

/** Value range each LUT spans (shader maps value→index linearly). */
export const LUT_RANGES: Record<string, [number, number]> = {
  REF: [-32, 95.5],
  VEL: [-64, 64],
}

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

/**
 * Velocity LUT over ±64 m/s: green = inbound (toward radar, negative),
 * red = outbound; brightness scales with speed, gray near zero.
 */
export function velocityLut(): Uint8Array {
  const lut = new Uint8Array(256 * 4)
  for (let i = 0; i < 256; i++) {
    const v = (i / 255) * 128 - 64 // m/s
    const mag = Math.min(Math.abs(v) / 50, 1)
    const bright = Math.round(70 + 185 * mag)
    if (Math.abs(v) < 1) {
      lut.set([110, 110, 110, 255], i * 4)
    } else if (v < 0) {
      lut.set([Math.round(bright * 0.15), bright, Math.round(bright * 0.25), 255], i * 4)
    } else {
      lut.set([bright, Math.round(bright * 0.15), Math.round(bright * 0.15), 255], i * 4)
    }
  }
  return lut
}
