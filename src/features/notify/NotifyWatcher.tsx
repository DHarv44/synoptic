import { useEffect } from 'react'
import { useHome } from '@/core/home/store'
import { useFeatureOption } from '@/core/settings/store'
import { acquireAlertsFeed, useAlertsData } from '@/features/alerts/store'
import { alertMessage, alertsAtPoint, meetsSeverity, type SeverityLevel } from '@/features/notify/service'
import { alreadyNotified, markNotified } from '@/features/notify/seen'

/**
 * Raises a desktop notification when a warning covers the user's home
 * location. Mounted for as long as the feature is enabled, not just while a
 * panel is open — a warning that only fires when you happen to be looking at
 * the right tab is worthless.
 *
 * The alerts feed does not pause on a hidden tab, so this keeps working in
 * the background (subject to the browser's timer throttling).
 */
export function NotifyWatcher() {
  const home = useHome((s) => s.point)
  const minimum = useFeatureOption<SeverityLevel>('notify', 'minSeverity')
  const alerts = useAlertsData()
  useEffect(() => acquireAlertsFeed(), [])

  useEffect(() => {
    if (!home || alerts.length === 0) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    for (const a of alertsAtPoint(alerts, home)) {
      if (!meetsSeverity(a.properties.severity, minimum)) continue
      if (alreadyNotified(a.id)) continue
      markNotified(a.id)
      // tag: the browser replaces rather than stacks if this ever repeats.
      new Notification(a.properties.event, { body: alertMessage(a), tag: a.id })
    }
  }, [alerts, home, minimum])

  return null
}
