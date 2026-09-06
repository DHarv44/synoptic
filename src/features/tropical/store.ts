import { createSharedFeed } from '@/core/data/sharedFeed'
import { fetchStormGis, type StormGis } from '@/features/tropical/gis'
import { NHC, fetchActiveStorms, type ActiveStorm } from '@/features/tropical/service'

export interface TropicalData {
  storms: ActiveStorm[]
  /** Storm id → products; absent when that storm's fetch failed. */
  gis: Record<string, StormGis>
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
    await Promise.all(
      storms.map(async (s) => {
        try {
          gis[s.id] = await fetchStormGis(s)
        } catch {
          // Health strip carries the error; the storm still lists.
        }
      }),
    )
    return { storms, gis }
  },
})

export const acquireTropicalFeed = feed.acquire

export function useTropical(): TropicalData | null {
  return feed.useData((s) => s.data)
}
