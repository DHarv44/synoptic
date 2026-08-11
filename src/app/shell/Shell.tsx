import { AppShell } from '@mantine/core'
import { TopBar } from '@/app/shell/TopBar'
import { AnalysisDock } from '@/app/shell/AnalysisDock'
import { TimelineBar } from '@/app/shell/TimelineBar'
import { Viewport } from '@/app/shell/Viewport'
import { useDock } from '@/app/shell/dockStore'
import { SearchSpotlight } from '@/features/search/SearchSpotlight'

export function Shell() {
  const dockOpen = useDock((s) => s.open)

  return (
    <AppShell
      header={{ height: 44 }}
      footer={{ height: 72 }}
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
      <AppShell.Main style={{ display: 'flex', height: '100dvh' }}>
        <Viewport />
      </AppShell.Main>
      <AppShell.Footer>
        <TimelineBar />
      </AppShell.Footer>
    </AppShell>
  )
}
