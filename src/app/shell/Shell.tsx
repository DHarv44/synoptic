import { AppShell } from '@mantine/core'
import { TopBar } from '@/app/shell/TopBar'
import { AnalysisDock } from '@/app/shell/AnalysisDock'
import { AttributionBar } from '@/app/shell/AttributionBar'
import { Viewport } from '@/app/shell/Viewport'
import { useDock } from '@/app/shell/dockStore'
import { SearchSpotlight } from '@/features/search/SearchSpotlight'
import { useChromeOpacity } from '@/ui/useChromeOpacity'

export function Shell() {
  const dockOpen = useDock((s) => s.open)
  useChromeOpacity()

  return (
    <AppShell
      header={{ height: 44 }}
      footer={{ height: 26 }}
      aside={{ width: 360, breakpoint: 'sm', collapsed: { desktop: !dockOpen, mobile: !dockOpen } }}
      padding={0}
    >
      <AppShell.Header>
        <TopBar />
      </AppShell.Header>
      <SearchSpotlight />
      <AppShell.Aside>
        <AnalysisDock />
      </AppShell.Aside>
      <AppShell.Main style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
        <Viewport />
      </AppShell.Main>
      <AppShell.Footer>
        <AttributionBar />
      </AppShell.Footer>
    </AppShell>
  )
}
