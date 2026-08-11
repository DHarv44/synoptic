import { lazy, Suspense, useState } from 'react'
import { Center, Loader, SegmentedControl, Stack } from '@mantine/core'
import { SectionPlot } from '@/features/radar/level2/SectionPlot'

/**
 * three.js, R3F and drei are ~1 MB and exist for this one panel, so they load
 * when the 3D view is first opened rather than at app boot. Everything that
 * imports three hangs off this module, so the whole subtree splits with it.
 */
const Volume3D = lazy(() =>
  import('@/features/radar/level2/Volume3D').then((m) => ({ default: m.Volume3D })),
)

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
        {view === '3d' ? (
          <Suspense
            fallback={
              <Center h="100%">
                <Loader size="sm" color="gray" />
              </Center>
            }
          >
            <Volume3D />
          </Suspense>
        ) : (
          <SectionPlot />
        )}
      </div>
    </Stack>
  )
}
