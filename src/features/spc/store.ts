import { fetchJson } from '@/core/data/fetchJson'
import { createSharedFeed } from '@/core/data/sharedFeed'
import {
  MCD_URL,
  SPC,
  WATCH_URL,
  type McdProps,
  type SpcCollection,
  type WatchProps,
} from '@/features/spc/service'

/** MCDs and watches are shared by the layer, the panel and the summary. */
const mcdFeed = createSharedFeed<SpcCollection<McdProps>>({
  source: SPC,
  cadenceMs: 5 * 60_000,
  featureId: 'spc',
  fetcher: () => fetchJson<SpcCollection<McdProps>>(SPC, MCD_URL, { fixture: 'spc-mcd' }),
})

const watchFeed = createSharedFeed<SpcCollection<WatchProps>>({
  source: SPC,
  cadenceMs: 5 * 60_000,
  featureId: 'spc',
  fetcher: () => fetchJson<SpcCollection<WatchProps>>(SPC, WATCH_URL, { fixture: 'spc-watch' }),
})

export const acquireMcdFeed = mcdFeed.acquire
export const acquireWatchFeed = watchFeed.acquire

export function useMcds(): Array<SpcCollection<McdProps>['features'][number]> {
  return mcdFeed.useData((s) => s.data)?.features ?? []
}

export function useWatches(): Array<SpcCollection<WatchProps>['features'][number]> {
  return watchFeed.useData((s) => s.data)?.features ?? []
}
