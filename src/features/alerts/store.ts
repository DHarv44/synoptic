import { fetchJson } from '@/core/data/fetchJson'
import { createSharedFeed } from '@/core/data/sharedFeed'
import {
  ALERTS_URL,
  NWS,
  sortBySeverity,
  type AlertFeature,
  type AlertsResponse,
} from '@/features/alerts/service'

const feed = createSharedFeed<AlertFeature[]>({
  source: NWS,
  cadenceMs: 2 * 60_000,
  featureId: 'alerts',
  fetcher: async () => {
    const res = await fetchJson<AlertsResponse>(NWS, ALERTS_URL, { fixture: 'nws-alerts' })
    return sortBySeverity(res.features)
  },
})

export const acquireAlertsFeed = feed.acquire

/** Severity-sorted active alerts (empty until the first poll lands). */
export function useAlertsData(): AlertFeature[] {
  return feed.useData((s) => s.data) ?? []
}
