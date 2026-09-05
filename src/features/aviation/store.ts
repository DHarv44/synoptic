import { fetchJson } from '@/core/data/fetchJson'
import { createSharedFeed } from '@/core/data/sharedFeed'
import {
  AWC,
  ISIGMET_URL,
  SIGMET_URL,
  intlVaAsAirSigmets,
  type AirSigmet,
  type IntlSigmet,
} from '@/features/aviation/service'

const feed = createSharedFeed<AirSigmet[]>({
  source: AWC,
  cadenceMs: 5 * 60_000,
  featureId: 'aviation',
  fetcher: async () => {
    const [domestic, intl] = await Promise.all([
      fetchJson<AirSigmet[]>(AWC, SIGMET_URL, { fixture: 'awc-airsigmet' }),
      fetchJson<IntlSigmet[]>(AWC, ISIGMET_URL, { fixture: 'awc-isigmet' }),
    ])
    return [...domestic, ...intlVaAsAirSigmets(intl)]
  },
})

export const acquireSigmetFeed = feed.acquire

/** All issued SIGMETs (empty until the first poll lands); filter for active. */
export function useSigmetData(): AirSigmet[] {
  return feed.useData((s) => s.data) ?? []
}
