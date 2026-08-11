import { AppShell } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { TopBar } from '@/app/shell/TopBar'
import { AnalysisDock } from '@/app/shell/AnalysisDock'
import { TimelineBar } from '@/app/shell/TimelineBar'
import { Viewport } from '@/app/shell/Viewport'
import { SettingsDrawer } from '@/app/settings/SettingsDrawer'
import { SearchSpotlight } from '@/features/search/SearchSpotlight'

export function Shell() {
  const [dockOpen, dock] = useDisclosure(true)
  const [settingsOpen, settings] = useDisclosure(false)

  return (
    <AppShell
      header={{ height: 44 }}
      footer={{ height: 72 }}
      aside={{ width: 360, breakpoint: 'sm', collapsed: { desktop: !dockOpen, mobile: !dockOpen } }}
      padding={0}
    >
      <AppShell.Header>
        <TopBar onToggleDock={dock.toggle} onOpenSettings={settings.open} />
      </AppShell.Header>
      <SettingsDrawer opened={settingsOpen} onClose={settings.close} />
      <SearchSpotlight />
      <AppShell.Aside>
        <AnalysisDock />
      </AppShell.Aside>
      <AppShell.Main style={{ display: 'flex', height: '100dvh' }}>
        <Viewport onOpenSettings={settings.open} />
      </AppShell.Main>
      <AppShell.Footer>
        <TimelineBar />
      </AppShell.Footer>
    </AppShell>
  )
}
