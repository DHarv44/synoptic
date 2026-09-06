/**
 * The wind-speed colour ramp — ONE definition feeding both the GLSL field
 * shader and the on-map legend, so the key can never drift from the wash.
 * A chart convention (fixed), not a preference: violet calm through blue,
 * teal, green, yellow, orange, red to magenta at 48+ m/s.
 */
export interface RampStop {
  /** Speed (m/s) by which the blend into this colour is complete. */
  upTo: number
  rgb: [number, number, number]
}

export const WIND_RAMP: RampStop[] = [
  { upTo: 1, rgb: [0.42, 0.35, 0.62] },
  { upTo: 4, rgb: [0.28, 0.44, 0.76] },
  { upTo: 8, rgb: [0.2, 0.65, 0.68] },
  { upTo: 13, rgb: [0.34, 0.74, 0.35] },
  { upTo: 19, rgb: [0.88, 0.82, 0.3] },
  { upTo: 27, rgb: [0.92, 0.55, 0.24] },
  { upTo: 36, rgb: [0.86, 0.26, 0.22] },
  { upTo: 48, rgb: [0.8, 0.24, 0.62] },
]

/** Top of the ramp: speeds beyond this all read as the last colour. */
export const RAMP_MAX_MS = WIND_RAMP[WIND_RAMP.length - 1].upTo

const f = (n: number): string => n.toFixed(2)
const vec3 = (c: [number, number, number]): string => `vec3(${f(c[0])}, ${f(c[1])}, ${f(c[2])})`

/** `vec3 ramp(float s)` for the field shader, generated from the stops. */
export function windRampGlsl(): string {
  const [first, ...rest] = WIND_RAMP
  const lines = [`  vec3 c = ${vec3(first.rgb)};`]
  let prev = first.upTo
  for (const stop of rest) {
    lines.push(`  c = mix(c, ${vec3(stop.rgb)}, smoothstep(${f(prev)}, ${f(stop.upTo)}, s));`)
    prev = stop.upTo
  }
  return `vec3 ramp(float s) {\n${lines.join('\n')}\n  return c;\n}`
}

/** CSS gradient of the same stops, left = calm, right = RAMP_MAX_MS. */
export function windRampCss(): string {
  const stops = WIND_RAMP.map((s) => {
    const pct = (s.upTo / RAMP_MAX_MS) * 100
    const [r, g, b] = s.rgb.map((v) => Math.round(v * 255))
    return `rgb(${r},${g},${b}) ${pct.toFixed(1)}%`
  })
  return `linear-gradient(to right, ${stops.join(', ')})`
}
