import { useEffect } from 'react'
import { SectionHint } from '@/ui/SectionHint'
import { activeSigmets } from '@/features/aviation/service'
import { acquireSigmetFeed, useSigmetData } from '@/features/aviation/store'

/** Count of active SIGMETs; convective ones make it an alert-toned count. */
export function AviationSummary() {
  useEffect(() => acquireSigmetFeed(), [])
  const active = activeSigmets(useSigmetData(), Date.now())
  if (active.length === 0) return null
  const convective = active.filter((s) => s.hazard === 'CONVECTIVE').length
  return (
    <SectionHint tone={convective > 0 ? 'alert' : undefined}>
      {active.length} SIGMET{active.length === 1 ? '' : 's'}
      {convective > 0 ? ` · ${convective} convective` : ''}
    </SectionHint>
  )
}
