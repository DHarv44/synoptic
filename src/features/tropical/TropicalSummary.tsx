import { useEffect } from 'react'
import { SectionHint } from '@/ui/SectionHint'
import { stormCategory } from '@/features/tropical/service'
import { acquireTropicalFeed, useTropical } from '@/features/tropical/store'

/** "3 active · Lowell Cat 3": count, and the strongest by name. */
export function TropicalSummary() {
  useEffect(() => acquireTropicalFeed(), [])
  const storms = useTropical()?.storms ?? []
  if (storms.length === 0) return null
  const strongest = [...storms].sort((a, b) => b.intensityKt - a.intensityKt)[0]
  const cat = stormCategory(strongest.classification, strongest.intensityKt)
  const hurricane = cat.key.startsWith('C')
  return (
    <SectionHint tone={hurricane ? 'alert' : undefined}>
      {storms.length} active · {strongest.name} {cat.label}
    </SectionHint>
  )
}
