/**
 * Polyline smoothing for chart geometry. Marching-squares isolines and
 * sparse bulletin fronts are both piecewise-straight; analysts draw curves.
 */

export type Pt = [number, number]

function closed(pts: Pt[]): boolean {
  const a = pts[0]
  const b = pts[pts.length - 1]
  return pts.length > 3 && a[0] === b[0] && a[1] === b[1]
}

/**
 * Chaikin corner cutting. Each pass replaces every corner with two points
 * at 1/4 and 3/4 of the flanking segments; two passes turn grid-resolution
 * isolines into curves without leaving the data's neighbourhood. Open lines
 * keep their endpoints (contours cut by the antimeridian must still end on
 * it); closed rings smooth through the join.
 */
export function chaikin(pts: Pt[], iterations = 2): Pt[] {
  if (pts.length < 3) return pts
  const ring = closed(pts)
  let cur = ring ? pts.slice(0, -1) : pts
  for (let it = 0; it < iterations; it++) {
    const next: Pt[] = []
    const n = cur.length
    if (!ring) next.push(cur[0])
    const last = ring ? n : n - 1
    for (let i = 0; i < last; i++) {
      const a = cur[i]
      const b = cur[(i + 1) % n]
      next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25])
      next.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75])
    }
    if (!ring) next.push(cur[n - 1])
    cur = next
  }
  return ring ? [...cur, cur[0]] : cur
}

/**
 * Uniform Catmull-Rom spline through every control point — for fronts,
 * whose bulletin points are hundreds of km apart and must be honoured
 * exactly while the line between them curves.
 */
export function catmullRom(pts: Pt[], samplesPerSegment = 8): Pt[] {
  if (pts.length < 3) return pts
  const out: Pt[] = [pts[0]]
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    for (let s = 1; s <= samplesPerSegment; s++) {
      const t = s / samplesPerSegment
      const t2 = t * t
      const t3 = t2 * t
      out.push([
        0.5 *
          (2 * p1[0] +
            (-p0[0] + p2[0]) * t +
            (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
            (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 *
          (2 * p1[1] +
            (-p0[1] + p2[1]) * t +
            (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
            (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ])
    }
  }
  return out
}
