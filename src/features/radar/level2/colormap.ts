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

/**
 * dBZ → 0..1 rgb, precomputed. The mesh builder needs a colour per vertex
 * over tens of thousands of quads; going through `dbzToCss` meant a stop
 * scan and three `parseInt`s on hex substrings every time. Indexed like
 * `reflectivityLut`: i = (dBZ + 32) × 2. Tuples are shared, never copied,
 * so lookups allocate nothing.
 */
const REF_RGB: Array<readonly [number, number, number] | null> = Array.from(
  { length: 256 },
  (_, i) => {
    const css = dbzToCss(i / 2 - 32)
    if (css === null) return null
    return [
      parseInt(css.slice(1, 3), 16) / 255,
      parseInt(css.slice(3, 5), 16) / 255,
      parseInt(css.slice(5, 7), 16) / 255,
    ] as const
  },
)

/** Reflectivity colour as rgb floats, or null below the 5 dBZ floor. */
export function dbzToRgb(dbz: number): readonly [number, number, number] | null {
  const i = Math.round((dbz + 32) * 2)
  if (i < 0) return null
  return REF_RGB[i > 255 ? 255 : i]
}

/**
 * Value range each LUT spans (shader maps value→index linearly). Ranges are
 * the conventional display windows, not the encodable extremes — CC never
 * usefully reads below ~0.2, and stretching the ramp over the full 0–1 wastes
 * most of it on values that never occur.
 */
export const LUT_RANGES: Record<string, [number, number]> = {
  REF: [-32, 95.5],
  VEL: [-64, 64],
  SW: [0, 20],
  ZDR: [-4, 8],
  PHI: [0, 360],
  RHO: [0.2, 1.05],
}

type Stop = readonly [value: number, hex: string]

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

/**
 * 256×1 RGBA LUT interpolating between colour stops across [min, max].
 * Reflectivity keeps its stepped NWS table; the dual-pol fields are
 * continuous quantities and read better as smooth ramps.
 */
function rampLut(stops: Stop[], [min, max]: [number, number]): Uint8Array {
  const lut = new Uint8Array(256 * 4)
  for (let i = 0; i < 256; i++) {
    const v = min + ((max - min) * i) / 255
    let lo = stops[0]
    let hi = stops[stops.length - 1]
    for (let s = 0; s < stops.length - 1; s++) {
      if (v >= stops[s][0] && v <= stops[s + 1][0]) {
        lo = stops[s]
        hi = stops[s + 1]
        break
      }
    }
    const span = hi[0] - lo[0]
    const f = span === 0 ? 0 : Math.min(Math.max((v - lo[0]) / span, 0), 1)
    const a = hexToRgb(lo[1])
    const b = hexToRgb(hi[1])
    lut[i * 4] = Math.round(a[0] + (b[0] - a[0]) * f)
    lut[i * 4 + 1] = Math.round(a[1] + (b[1] - a[1]) * f)
    lut[i * 4 + 2] = Math.round(a[2] + (b[2] - a[2]) * f)
    lut[i * 4 + 3] = 255
  }
  return lut
}

/** Spectrum width: how varied the motion is inside a gate. */
const SW_STOPS: Stop[] = [
  [0, '#1a1a2e'],
  [4, '#2b7bba'],
  [8, '#41ab5d'],
  [12, '#fdd835'],
  [16, '#f4511e'],
  [20, '#ffffff'],
]

/**
 * Differential reflectivity: how much flatter targets are than they are
 * tall. Near zero is round (hail, dry snow); high positive is flattened
 * raindrops; negative is unusual and worth noticing.
 */
const ZDR_STOPS: Stop[] = [
  [-4, '#6a1b9a'],
  [-1, '#283593'],
  [0, '#546e7a'],
  [0.5, '#43a047'],
  [1.5, '#c0ca33'],
  [3, '#fb8c00'],
  [5, '#e53935'],
  [8, '#ffffff'],
]

/** Differential phase, cyclic over 0–360°. */
const PHI_STOPS: Stop[] = [
  [0, '#000004'],
  [90, '#3b0f70'],
  [180, '#b73779'],
  [270, '#fe9f6d'],
  [360, '#fcfdbf'],
]

/**
 * Correlation coefficient: how alike the targets in a gate are. Above ~0.97
 * is uniform precipitation; the low values are what identify everything that
 * isn't weather — ground clutter, birds, chaff, debris — so the ramp spends
 * its contrast down there rather than in the flat top.
 */
const RHO_STOPS: Stop[] = [
  [0.2, '#4a148c'],
  [0.6, '#1e88e5'],
  [0.8, '#00acc1'],
  [0.9, '#43a047'],
  [0.95, '#fdd835'],
  [0.98, '#fb8c00'],
  [1.0, '#e53935'],
  [1.05, '#ffffff'],
]

const RAMPS: Record<string, Stop[]> = {
  SW: SW_STOPS,
  ZDR: ZDR_STOPS,
  PHI: PHI_STOPS,
  RHO: RHO_STOPS,
}

/** The 256×1 RGBA table for a moment, for upload as a shader texture. */
export function lutFor(moment: string): Uint8Array {
  if (moment === 'VEL') return velocityLut()
  if (moment === 'REF') return reflectivityLut()
  const stops = RAMPS[moment]
  if (!stops) return reflectivityLut()
  return rampLut(stops, LUT_RANGES[moment] ?? [0, 1])
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
