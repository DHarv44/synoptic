import { create } from 'zustand'
import { startPoller } from '@/core/data/scheduler'
import { featureEnabled, featureOption } from '@/core/settings/store'
import { NHC_ATCF, fetchModelGuidance, type ModelGuidance } from '@/features/tropical/atcf'
import { peekTropical } from '@/features/tropical/store'

interface ModelState {
  byStorm: Record<string, ModelGuidance>
}

export const useModelTracks = create<ModelState>(() => ({ byStorm: {} }))

let stop: (() => void) | null = null
let refs = 0

/**
 * Model guidance is opt-in (the `models` setting): it is heavy for NHC to
 * serve and cluttered on the map, so the poller is gated on the option and
 * wakes the moment it is switched on. Storms come from the tropical feed.
 */
export function acquireModelTracks(): () => void {
  refs++
  if (refs === 1) {
    stop = startPoller({
      source: NHC_ATCF,
      cadenceMs: 30 * 60_000,
      enabled: () => featureEnabled('tropical') && featureOption<boolean>('tropical', 'models') === true,
      run: async () => {
        const ids = (peekTropical()?.storms ?? []).map((s) => s.id)
        const byStorm: Record<string, ModelGuidance> = {}
        await Promise.all(
          ids.map(async (id) => {
            try {
              byStorm[id] = await fetchModelGuidance(id)
            } catch {
              // Health strip carries it; the storm simply has no spaghetti.
            }
          }),
        )
        useModelTracks.setState({ byStorm })
      },
    })
  }
  return () => {
    refs--
    if (refs === 0) {
      stop?.()
      stop = null
    }
  }
}
