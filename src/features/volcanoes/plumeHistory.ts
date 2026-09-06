import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { VolcanicAshAdvisory } from '@/features/volcanoes/vaa'

export interface PlumePoint {
  /** Advisory issue time (ms). */
  t: number
  /** Plume top, flight level. */
  fl: number
}

/** Older points fall off: a week is the horizon an eruption trend needs. */
export const PLUME_MAX_AGE_MS = 7 * 86_400_000

interface PlumeHistoryState {
  /** Smithsonian volcano number → points, oldest first. */
  series: Record<string, PlumePoint[]>
  record: (advisories: VolcanicAshAdvisory[], nowMs?: number) => void
}

/**
 * Plume-top history, accumulated as advisories arrive. tgftp only ever
 * exposes the LATEST bulletin per slot, so there is no archive to seed
 * from — the series grows while SYNOPTIC is open and persists between
 * sessions. One point per advisory issue time.
 */
export const usePlumeHistory = create<PlumeHistoryState>()(
  persist(
    (set) => ({
      series: {},
      record: (advisories, nowMs = Date.now()) =>
        set((s) => {
          const series: Record<string, PlumePoint[]> = {}
          let changed = false
          const fresh = (p: PlumePoint): boolean => nowMs - p.t <= PLUME_MAX_AGE_MS
          for (const [key, pts] of Object.entries(s.series)) {
            const kept = pts.filter(fresh)
            if (kept.length !== pts.length) changed = true
            if (kept.length > 0) series[key] = kept
          }
          for (const a of advisories) {
            if (a.volcanoNumber === null || a.issuedMs === null || a.topFl === null) continue
            const key = String(a.volcanoNumber)
            const cur = series[key] ?? []
            if (cur.some((p) => p.t === a.issuedMs)) continue
            series[key] = [...cur, { t: a.issuedMs, fl: a.topFl }]
              .filter(fresh)
              .sort((x, y) => x.t - y.t)
            changed = true
          }
          return changed ? { series } : s
        }),
    }),
    { name: 'synoptic.plumes', version: 1 },
  ),
)

const EMPTY: PlumePoint[] = []

export function usePlumeSeries(volcanoNumber: number | null): PlumePoint[] {
  return usePlumeHistory((s) =>
    volcanoNumber === null ? EMPTY : (s.series[String(volcanoNumber)] ?? EMPTY),
  )
}

/** Latest point and how it compares with the one before it. */
export function plumeTrend(
  points: PlumePoint[],
): { latest: PlumePoint; previous: PlumePoint | null; delta: number } | null {
  if (points.length === 0) return null
  const latest = points[points.length - 1]
  const previous = points.length > 1 ? points[points.length - 2] : null
  return { latest, previous, delta: previous ? latest.fl - previous.fl : 0 }
}
