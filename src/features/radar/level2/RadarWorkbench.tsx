import { useState } from 'react'
import { SegmentedControl, Stack } from '@mantine/core'
import { Volume3D } from '@/features/radar/level2/Volume3D'
import { SectionPlot } from '@/features/radar/level2/SectionPlot'

type View = '3d' | 'section'

/**
 * The radar workbench: vertical views of the current volume. Both answer
 * the same question — what does this storm look like through its depth —
 * so they share one panel rather than competing for rail space.
 */
export function RadarWorkbench() {
  const [view, setView] = useState<View>('3d')

  return (
    <Stack gap={0} h="100%" style={{ minHeight: 0 }}>
      <SegmentedControl
        size="xs"
        m="xs"
        value={view}
        onChange={(v) => setView(v as View)}
        data={[
          { value: '3d', label: '3D echo' },
          { value: 'section', label: 'Cross-section' },
        ]}
      />
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {view === '3d' ? <Volume3D /> : <SectionPlot />}
      </div>
    </Stack>
  )
}
