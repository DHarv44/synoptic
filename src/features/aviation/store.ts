import { fetchJson } from '@/core/data/fetchJson'
import { createSharedFeed } from '@/core/data/sharedFeed'
import { AWC, SIGMET_URL, type AirSigmet } from '@/features/aviation/service'

const feed = createSharedFeed<AirSigmet[]>({
  source: AWC,
  cadenceMs: 5 * 60_000,
  featureId: 'aviation',
  fetcher: () => fetchJson<AirSigmet[]>(AWC, SIGMET_URL, { fixture: 'awc-airsigmet' }),
})

export const acquireSigmetFeed = feed.acquire

/** All issued SIGMETs (empty until the first poll lands); filter for active. */
export function useSigmetData(): AirSigmet[] {
  return feed.useData((s) => s.data) ?? []
}
