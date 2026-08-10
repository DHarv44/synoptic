import { reportDisabled } from '@/core/data/healthStore'
import type { SourceRef } from '@/core/data/types'

export interface PollerOptions {
  source: SourceRef
  cadenceMs: number
  /** Polling pauses (and reports disabled) while this returns false. */
  enabled: () => boolean
  run: () => Promise<void>
}

const MAX_BACKOFF_FACTOR = 8

/**
 * Per-source polling loop: respects cadence, backs off exponentially on
 * error, pauses when the owning feature is disabled or the tab is hidden.
 * Returns a stop function.
 */
export function startPoller(opts: PollerOptions): () => void {
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let backoff = 1

  async function cycle(): Promise<void> {
    if (stopped) return
    if (!opts.enabled()) {
      reportDisabled(opts.source)
      schedule(opts.cadenceMs)
      return
    }
    if (document.hidden) {
      schedule(opts.cadenceMs)
      return
    }
    try {
      await opts.run()
      backoff = 1
    } catch {
      // fetchJson already reported the error; just back off
      backoff = Math.min(backoff * 2, MAX_BACKOFF_FACTOR)
    }
    schedule(opts.cadenceMs * backoff)
  }

  function schedule(delayMs: number): void {
    if (stopped) return
    timer = setTimeout(() => void cycle(), delayMs)
  }

  void cycle()
  return () => {
    stopped = true
    if (timer !== undefined) clearTimeout(timer)
  }
}
