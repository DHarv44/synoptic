import { useEffect } from 'react'
import { SectionHint } from '@/ui/SectionHint'
import { useHome } from '@/core/home/store'
import { acquireAlertsFeed, useAlertsData } from '@/features/alerts/store'
import { alertsAtPoint } from '@/features/notify/service'

/** Whether anything is in force where the user actually is. */
export function HomeAlertsSummary() {
  const home = useHome((s) => s.point)
  const alerts = useAlertsData()
  useEffect(() => acquireAlertsFeed(), [])

  if (!home) return <SectionHint>not set</SectionHint>
  const mine = alertsAtPoint(alerts, home)
  if (mine.length === 0) return <SectionHint>clear</SectionHint>
  return (
    <SectionHint tone="alert">
      {mine.length === 1 ? mine[0].properties.event : `${mine.length} warnings`}
    </SectionHint>
  )
}
