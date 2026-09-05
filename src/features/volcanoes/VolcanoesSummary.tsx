import { useEffect } from 'react'
import { SectionHint } from '@/ui/SectionHint'
import { acquireAdvisoryFeed, acquireUsgsFeed, useAdvisories, useUsgsNotices } from '@/features/volcanoes/store'

/** Eruption count; any live ash advisory makes it alert-toned. */
export function VolcanoesSummary() {
  useEffect(() => acquireAdvisoryFeed(), [])
  useEffect(() => acquireUsgsFeed(), [])
  const erupting = useAdvisories().length
  const elevated = useUsgsNotices().filter((n) => n.alertLevel !== 'NORMAL').length
  if (erupting === 0 && elevated === 0) return null
  const parts = [
    erupting > 0 && `${erupting} erupting`,
    elevated > 0 && `${elevated} elevated`,
  ].filter(Boolean)
  return <SectionHint tone={erupting > 0 ? 'alert' : undefined}>{parts.join(' · ')}</SectionHint>
}
