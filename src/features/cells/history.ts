import type { CellFeature } from '@/features/cells/service'

export interface TrendPoint {
  t: number
  maxDbz: number
  vil: number
  top: number
  hail: number
}

const MAX_POINTS = 40
const MAX_CELLS = 400
const history = new Map<string, TrendPoint[]>()

export function cellKey(c: CellFeature): string {
  return `${c.properties.nexrad}-${c.properties.storm_id}`
}

/**
 * Record a snapshot of every cell. The IEM attribute feed has no history
 * endpoint, so trends only cover what this session has observed.
 */
export function recordSnapshot(cells: CellFeature[]): void {
  for (const c of cells) {
    const k = cellKey(c)
    const p = c.properties
    const t = Date.parse(p.valid)
    const series = history.get(k) ?? []
    if (series.length > 0 && series[series.length - 1].t === t) continue
    series.push({ t, maxDbz: p.max_dbz, vil: p.vil, top: p.top, hail: p.max_size })
    if (series.length > MAX_POINTS) series.shift()
    history.set(k, series)
  }
  // bound memory: drop the oldest-keyed entries beyond the cap
  if (history.size > MAX_CELLS) {
    const excess = history.size - MAX_CELLS
    let i = 0
    for (const k of history.keys()) {
      if (i++ >= excess) break
      history.delete(k)
    }
  }
}

export function trendFor(key: string): TrendPoint[] {
  return history.get(key) ?? []
}

/** Change in max dBZ over the observed window (null if <2 points). */
export function dbzDelta(key: string): number | null {
  const s = history.get(key)
  if (!s || s.length < 2) return null
  return s[s.length - 1].maxDbz - s[0].maxDbz
}
