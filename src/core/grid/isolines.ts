/**
 * Marching-squares isolines over a regular grid, chained into polylines.
 *
 * Hand-rolled rather than d3-contour because the outputs differ in kind:
 * d3-contour produces filled threshold *regions*, whose boundaries include
 * runs along the grid frame — drawn as isobars, every chart edge grows a
 * false line. Emitting only the segments that actually cross a threshold,
 * then chaining them, gives clean open lines and closed loops with nothing
 * along the borders.
 *
 * Coordinates are fractional (x = column, y = row) in grid space; mapping
 * to lon/lat is the caller's business, which keeps this testable with tiny
 * synthetic grids.
 */

export interface Isoline {
  level: number
  /** Fractional grid coordinates; first === last for a closed loop. */
  points: Array<[number, number]>
}

type Pt = [number, number]

/** Where the threshold crosses between two corner values, 0..1. */
function frac(t: number, v0: number, v1: number): number {
  return (t - v0) / (v1 - v0)
}

/**
 * Endpoint identity. Precision can be near-bitwise because a shared edge's
 * crossing is computed from the same inputs by both adjacent cells — the
 * floats are identical by construction. Coarser keys once merged the four
 * distinct crossings that huddle around a nudged node into one false
 * degree-4 vertex, and the chain walker tied micro-loops there.
 */
const key = (p: Pt): string => `${p[0].toFixed(9)},${p[1].toFixed(9)}`

/** Chain a soup of segments into polylines by matching endpoints. */
function chain(segments: Array<[Pt, Pt]>): Pt[][] {
  const byEnd = new Map<string, number[]>()
  segments.forEach((s, i) => {
    for (const p of [s[0], s[1]]) {
      const k = key(p)
      const list = byEnd.get(k)
      if (list) list.push(i)
      else byEnd.set(k, [i])
    }
  })

  const used = new Uint8Array(segments.length)
  const lines: Pt[][] = []

  for (let start = 0; start < segments.length; start++) {
    if (used[start]) continue
    used[start] = 1
    const line: Pt[] = [segments[start][0], segments[start][1]]

    // Extend forward from the tail, then backward from the head.
    for (const dir of [1, 0] as const) {
      for (;;) {
        const end = dir === 1 ? line[line.length - 1] : line[0]
        const next = (byEnd.get(key(end)) ?? []).find((i) => !used[i])
        if (next === undefined) break
        used[next] = 1
        const [a, b] = segments[next]
        const p = key(a) === key(end) ? b : a
        if (dir === 1) line.push(p)
        else line.unshift(p)
      }
    }
    lines.push(line)
  }
  return lines
}

export function isolines(
  values: ArrayLike<number>,
  width: number,
  height: number,
  thresholds: number[],
): Isoline[] {
  const out: Isoline[] = []

  for (const t of thresholds) {
    // A grid value exactly on the threshold — routine with round contour
    // intervals over real data — would put a crossing precisely on a node
    // shared by four cells, where four segments meet and the chain walker
    // ties itself into micro-loops. Nudging the value off the threshold
    // keeps every crossing strictly inside an edge and the topology clean.
    const eps = (Math.abs(t) + 1) * 1e-9
    const at = (x: number, y: number): number => {
      const v = values[y * width + x]
      return v === t ? t + eps : v
    }
    const segments: Array<[Pt, Pt]> = []
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const a = at(x, y) // (x,   y)
        const b = at(x + 1, y) // (x+1, y)
        const c = at(x + 1, y + 1) // (x+1, y+1)
        const d = at(x, y + 1) // (x,   y+1)
        const code =
          (a >= t ? 8 : 0) | (b >= t ? 4 : 0) | (c >= t ? 2 : 0) | (d >= t ? 1 : 0)
        if (code === 0 || code === 15) continue

        const bottom: Pt = [x + frac(t, a, b), y]
        const right: Pt = [x + 1, y + frac(t, b, c)]
        const top: Pt = [x + frac(t, d, c), y + 1]
        const left: Pt = [x, y + frac(t, a, d)]

        switch (code) {
          case 1:
          case 14:
            segments.push([left, top])
            break
          case 2:
          case 13:
            segments.push([top, right])
            break
          case 3:
          case 12:
            segments.push([left, right])
            break
          case 4:
          case 11:
            segments.push([bottom, right])
            break
          case 6:
          case 9:
            segments.push([bottom, top])
            break
          case 7:
          case 8:
            segments.push([left, bottom])
            break
          case 5:
          case 10: {
            // Saddle: split by the cell centre so the two lines cannot cross.
            const centreHigh = (a + b + c + d) / 4 >= t
            if ((code === 5) === centreHigh) {
              segments.push([left, top], [bottom, right])
            } else {
              segments.push([left, bottom], [top, right])
            }
            break
          }
        }
      }
    }
    for (const points of chain(segments)) out.push({ level: t, points })
  }
  return out
}

/** Evenly spaced thresholds covering [min, max] at `interval`, aligned to it. */
export function thresholdsFor(min: number, max: number, interval: number): number[] {
  const out: number[] = []
  for (let t = Math.ceil(min / interval) * interval; t <= max; t += interval) out.push(t)
  return out
}
