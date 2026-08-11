import { create, type UseBoundStore, type StoreApi } from 'zustand'
import { startPoller } from '@/core/data/scheduler'
import { featureEnabled } from '@/core/settings/store'
import type { SourceRef } from '@/core/data/types'

export interface SharedFeed<T> {
  useData: UseBoundStore<StoreApi<{ data: T | null }>>
  /** Ref-counted: polling runs while ≥1 consumer is mounted. */
  acquire: () => () => void
}

/**
 * A polled data feed shared by multiple components (layer + panel):
 * one poller, ref-counted by mounted consumers, gated on the owning
 * feature's enabled state.
 */
export function createSharedFeed<T>(opts: {
  source: SourceRef
  cadenceMs: number
  featureId: string
  fetcher: () => Promise<T>
}): SharedFeed<T> {
  const useData = create<{ data: T | null }>(() => ({ data: null }))
  let refCount = 0
  let stop: (() => void) | null = null

  function acquire(): () => void {
    refCount++
    if (refCount === 1) {
      stop = startPoller({
        source: opts.source,
        cadenceMs: opts.cadenceMs,
        enabled: () => featureEnabled(opts.featureId),
        run: async () => {
          useData.setState({ data: await opts.fetcher() })
        },
      })
    }
    return () => {
      refCount--
      if (refCount === 0) {
        stop?.()
        stop = null
      }
    }
  }

  return { useData, acquire }
}
