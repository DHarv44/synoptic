import { SectionHint } from '@/ui/SectionHint'
import { useVisibleAlerts } from '@/features/alerts/useVisibleAlerts'

/** How many warnings are in view — the reason to open this section at all. */
export function AlertsSummary() {
  const { visible } = useVisibleAlerts()
  if (visible.length === 0) return <SectionHint>none in view</SectionHint>
  const severe = visible.filter(
    ({ a }) => a.properties.severity === 'Extreme' || a.properties.severity === 'Severe',
  ).length
  return (
    <SectionHint tone={severe > 0 ? 'alert' : 'quiet'}>
      {visible.length} in view{severe > 0 && ` · ${severe} severe`}
    </SectionHint>
  )
}
