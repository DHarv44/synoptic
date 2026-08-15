import { useEffect } from 'react'
import { SectionHint } from '@/ui/SectionHint'
import { unexpired } from '@/features/spc/service'
import { acquireMcdFeed, acquireWatchFeed, useMcds, useWatches } from '@/features/spc/store'

/** Watch/MCD counts; any active watch makes it an alert-toned count. */
export function SpcSummary() {
  useEffect(() => acquireMcdFeed(), [])
  useEffect(() => acquireWatchFeed(), [])
  const mcds = unexpired(useMcds(), Date.now())
  const watches = useWatches()
  if (mcds.length === 0 && watches.length === 0) return null

  const parts = [
    watches.length > 0 && `${watches.length} watch${watches.length === 1 ? '' : 'es'}`,
    mcds.length > 0 && `${mcds.length} MCD${mcds.length === 1 ? '' : 's'}`,
  ].filter(Boolean)
  return <SectionHint tone={watches.length > 0 ? 'alert' : undefined}>{parts.join(' · ')}</SectionHint>
}
