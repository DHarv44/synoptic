import { useTimeline } from '@/core/time/timelineStore'

/**
 * Several layers can prefetch loop frames at once (radar mosaic, satellite),
 * and the loop must not run past the SLOWEST of them. Each prefetcher gets
 * its own reporter; the store sees the minimum across active reporters, and
 * `null` again only when the last reporter is gone.
 */
const counts = new Map<string, number>()

function push(): void {
  const { setWarmFrames } = useTimeline.getState()
  if (counts.size === 0) {
    setWarmFrames(null)
    return
  }
  setWarmFrames(Math.min(...counts.values()))
}

export interface WarmthReporter {
  report: (framesReady: number) => void
  /** Stop reporting; the layer's opinion no longer holds the loop back. */
  dispose: () => void
}

export function createWarmthReporter(id: string): WarmthReporter {
  counts.set(id, 0)
  push()
  return {
    report: (framesReady) => {
      counts.set(id, framesReady)
      push()
    },
    dispose: () => {
      counts.delete(id)
      push()
    },
  }
}
