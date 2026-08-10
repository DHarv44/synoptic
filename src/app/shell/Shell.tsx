import { AppShell } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { TopBar } from '@/app/shell/TopBar'
import { LayerRail } from '@/app/shell/LayerRail'
import { AnalysisDock } from '@/app/shell/AnalysisDock'
import { TimelineBar } from '@/app/shell/TimelineBar'
import { Viewport } from '@/app/shell/Viewport'

export function Shell() {
  const [railOpen, rail] = useDisclosure(true)
  const [dockOpen, dock] = useDisclosure(true)

  return (
    <AppShell
      header={{ height: 44 }}
      footer={{ height: 72 }}
      navbar={{ width: 220, breakpoint: 'sm', collapsed: { desktop: !railOpen, mobile: !railOpen } }}
      aside={{ width: 340, breakpoint: 'sm', collapsed: { desktop: !dockOpen, mobile: !dockOpen } }}
      padding={0}
    >
      <AppShell.Header>
        <TopBar onToggleRail={rail.toggle} onToggleDock={dock.toggle} />
      </AppShell.Header>
      <AppShell.Navbar>
        <LayerRail />
      </AppShell.Navbar>
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
