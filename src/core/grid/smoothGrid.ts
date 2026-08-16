/**
 * The 9-point smoother auto-contoured MSLP needs before it is drawable:
 * sea-level reduction over high terrain carries 1–2 hPa of noise that a
 * human analyst filters by eye, and contouring it verbatim wallpapers the
 * Rockies with closed squiggles that aren't weather. Each pass is the
 * separable (1-2-1)/4 kernel in x then y, edges clamped.
 */
export function smoothGrid(
  values: Float64Array,
  w: number,
  h: number,
  passes: number,
): Float64Array {
  let cur: Float64Array = values
  let next: Float64Array = new Float64Array(w * h)
  const tmp = new Float64Array(w * h)
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      const row = y * w
      for (let x = 0; x < w; x++) {
        const l = cur[row + Math.max(0, x - 1)]
        const r = cur[row + Math.min(w - 1, x + 1)]
        tmp[row + x] = (l + 2 * cur[row + x] + r) / 4
      }
    }
    for (let y = 0; y < h; y++) {
      const up = Math.max(0, y - 1) * w
      const dn = Math.min(h - 1, y + 1) * w
      const row = y * w
      for (let x = 0; x < w; x++) {
        next[row + x] = (tmp[up + x] + 2 * tmp[row + x] + tmp[dn + x]) / 4
      }
    }
    ;[cur, next] = [next, cur === values ? new Float64Array(w * h) : cur]
  }
  return cur
}
