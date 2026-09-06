import { reportDisabled } from '@/core/data/healthStore'
import { useSettings } from '@/core/settings/store'
import type { SourceRef } from '@/core/data/types'

export interface PollerOptions {
  source: SourceRef
  cadenceMs: number
  /** Polling pauses (and reports disabled) while this returns false. */
  enabled: () => boolean
  run: () => Promise<void>
  /** Skip cycles while the tab is hidden (use for heavy fetches only). */
  pauseWhenHidden?: boolean
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
  /** Parked because the feature was off: the next enable must not wait a cadence. */
  let parkedDisabled = false

  async function cycle(): Promise<void> {
    if (stopped) return
    if (!opts.enabled()) {
      parkedDisabled = true
      reportDisabled(opts.source)
      schedule(opts.cadenceMs)
      return
    }
    parkedDisabled = false
    if (opts.pauseWhenHidden === true && document.hidden) {
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

  // Fast-resume: a hidden-paused poller runs promptly when the tab returns.
  const onVisible = (): void => {
    if (!document.hidden && opts.pauseWhenHidden === true) {
      if (timer !== undefined) clearTimeout(timer)
      void cycle()
    }
  }
  document.addEventListener('visibilitychange', onVisible)

  // Wake on enable. A feed a panel holds open while its layer is off parks
  // here with a full cadence on the clock — ten minutes for the volcano
  // feeds — so flipping the layer on showed nothing until that timer ran.
  // The settings store is the only thing that flips `enabled`, so it is
  // the only thing worth listening to.
  const unsubSettings = useSettings.subscribe(() => {
    if (stopped || !parkedDisabled || !opts.enabled()) return
    parkedDisabled = false
    if (timer !== undefined) clearTimeout(timer)
    void cycle()
  })

  void cycle()
  return () => {
    stopped = true
    if (timer !== undefined) clearTimeout(timer)
    document.removeEventListener('visibilitychange', onVisible)
    unsubSettings()
  }
}
