import { create } from 'zustand'
import { fetchJson } from '@/core/data/fetchJson'
import { startPoller } from '@/core/data/scheduler'
import { featureEnabled } from '@/core/settings/store'
import {
  ALERTS_URL,
  NWS,
  sortBySeverity,
  type AlertFeature,
  type AlertsResponse,
} from '@/features/alerts/service'

const POLL_MS = 2 * 60_000

interface AlertsState {
  alerts: AlertFeature[]
}

export const useAlerts = create<AlertsState>(() => ({ alerts: [] }))

let refCount = 0
let stop: (() => void) | null = null

/**
 * Ref-counted poller shared by the alerts layer and panel: fetching runs
 * while at least one consumer is mounted (i.e. the feature is enabled).
 */
export function acquireAlertsFeed(): () => void {
  refCount++
  if (refCount === 1) {
    stop = startPoller({
      source: NWS,
      cadenceMs: POLL_MS,
      enabled: () => featureEnabled('alerts'),
      run: async () => {
        const data = await fetchJson<AlertsResponse>(NWS, ALERTS_URL, { fixture: 'nws-alerts' })
        useAlerts.setState({ alerts: sortBySeverity(data.features) })
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
