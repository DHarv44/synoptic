import type { Pt } from '@/core/geo/smooth'
import { isClosedRing, ringBbox, ringContains, type Bbox } from '@/core/geo/rings'
import type { ContourLine } from '@/core/grid/contours'
import type { Extremum } from '@/core/grid/extrema'

export interface ChartCenter {
  kind: 'high' | 'low'
  lat: number
  lon: number
  value: number
}

export interface CenterOptions {
  /**
   * How far past its innermost ring's level the extremum must reach.
   * Half a contour interval kills the tropical wiggle that scrapes a ring
   * by 0.2 hPa while keeping every centre with real depth.
   */
  minDepth?: number
  /** Smallest ring bbox dimension (degrees) worth a letter — noise-scale
   * circles at grid resolution are artifacts, not circulations. */
  minRingDeg?: number
}

interface Ring {
  coords: Pt[]
  bbox: Bbox
  area: number
  level: number
  spanDeg: number
}

/**
 * The H and L a chart marks, defined the way a reader defines them: a
 * centre exists exactly where a closed isoline encloses a field extremum.
 * Every raw extremum is assigned its smallest enclosing ring; each ring
 * keeps only its strongest claimant, so a wiggle inside a real high's
 * circulation never earns its own letter. No enclosing ring, no mark —
 * which guarantees the demanded invariant by construction: every marked
 * centre sits inside a circle.
 */
export function pickCenters(
  extrema: Extremum[],
  lines: ContourLine[],
  opts: CenterOptions = {},
): ChartCenter[] {
  const rings: Ring[] = lines
    .filter((l) => isClosedRing(l.coordinates))
    .map((l) => {
      const bbox = ringBbox(l.coordinates)
      return {
        coords: l.coordinates,
        bbox,
        area: (bbox.maxX - bbox.minX) * (bbox.maxY - bbox.minY),
        level: l.level,
        spanDeg: Math.min(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY),
      }
    })

  const minDepth = opts.minDepth ?? 0
  const minRingDeg = opts.minRingDeg ?? 0

  // ring index -> strongest extremum claiming it
  const owners = new Map<number, Extremum>()
  for (const e of extrema) {
    let best = -1
    let bestArea = Infinity
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i]
      if (r.area >= bestArea) continue
      const { bbox } = r
      if (e.lon < bbox.minX || e.lon > bbox.maxX || e.lat < bbox.minY || e.lat > bbox.maxY) {
        continue
      }
      if (!ringContains(r.coords, [e.lon, e.lat])) continue
      best = i
      bestArea = r.area
    }
    if (best === -1) continue
    if (Math.abs(e.value - rings[best].level) < minDepth) continue
    if (rings[best].spanDeg < minRingDeg) continue
    const cur = owners.get(best)
    if (cur === undefined) {
      owners.set(best, e)
    } else if (e.kind === cur.kind) {
      const better = e.kind === 'high' ? e.value > cur.value : e.value < cur.value
      if (better) owners.set(best, e)
    }
    // Opposite kinds claiming one innermost ring is degenerate (a saddle
    // artifact); the incumbent stands.
  }
  return [...owners.values()].map((e) => ({
    kind: e.kind,
    lat: e.lat,
    lon: e.lon,
    value: e.value,
  }))
}
