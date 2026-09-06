import { createSharedFeed } from '@/core/data/sharedFeed'
import { fetchBestTrack, type BestTrackPoint } from '@/features/tropical/atcf'
import { fetchStormGis, type StormGis } from '@/features/tropical/gis'
import { NHC, fetchActiveStorms, type ActiveStorm } from '@/features/tropical/service'

export interface TropicalData {
  storms: ActiveStorm[]
  /** Storm id → products; absent when that storm's fetch failed. */
  gis: Record<string, StormGis>
  /** Storm id → best track so far (the intensity history). */
  history: Record<string, BestTrackPoint[]>
}

/**
 * One feed for the list and every storm's products, shared by the layer,
 * the panel and the summary. Advisories come 6-hourly with 3-hourly
 * intermediates, so ten minutes is prompt without hammering NHC.
 */
const feed = createSharedFeed<TropicalData>({
  source: NHC,
  cadenceMs: 10 * 60_000,
  featureId: 'tropical',
  fetcher: async () => {
    const storms = await fetchActiveStorms()
    const gis: Record<string, StormGis> = {}
    const history: Record<string, BestTrackPoint[]> = {}
    await Promise.all(
      storms.flatMap((s) => [
        fetchStormGis(s)
          .then((g) => {
            gis[s.id] = g
          })
          .catch(() => {
            // Health strip carries the error; the storm still lists.
          }),
        fetchBestTrack(s.id)
          .then((h) => {
            history[s.id] = h
          })
          .catch(() => undefined),
      ]),
    )
    return { storms, gis, history }
  },
})

export const acquireTropicalFeed = feed.acquire

export function useTropical(): TropicalData | null {
  return feed.useData((s) => s.data)
}

/** Non-hook read of the feed's current data, for pollers. */
export function peekTropical(): TropicalData | null {
  return feed.useData.getState().data
}
