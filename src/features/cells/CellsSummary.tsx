import { SectionHint } from '@/ui/SectionHint'
import { useVisibleCells } from '@/features/cells/useVisibleCells'

/** Cell count in view, flagging rotation since that's what you'd look for. */
export function CellsSummary() {
  const { visible } = useVisibleCells()
  if (visible.length === 0) return <SectionHint>none in view</SectionHint>
  const rotating = visible.filter(
    (c) => c.properties.tvs !== 'NONE' || c.properties.meso !== 'NONE',
  ).length
  return (
    <SectionHint tone={rotating > 0 ? 'alert' : 'quiet'}>
      {visible.length} in view{rotating > 0 && ` · ${rotating} rotating`}
    </SectionHint>
  )
}
