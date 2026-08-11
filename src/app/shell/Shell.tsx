import { AppShell } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { TopBar } from '@/app/shell/TopBar'
import { AnalysisDock } from '@/app/shell/AnalysisDock'
import { AttributionBar } from '@/app/shell/AttributionBar'
import { Viewport } from '@/app/shell/Viewport'
import { useDock } from '@/app/shell/dockStore'
import { SearchSpotlight } from '@/features/search/SearchSpotlight'
import { useChromeOpacity } from '@/ui/useChromeOpacity'

export const MOBILE_QUERY = '(max-width: 48em)'

export function Shell() {
  const dockOpen = useDock((s) => s.open)
  const isMobile = useMediaQuery(MOBILE_QUERY) ?? false
  useChromeOpacity()

  return (
    <AppShell
      header={{ height: 44 }}
      footer={isMobile ? undefined : { height: 26 }}
      aside={
        isMobile
          ? undefined
          : { width: 360, breakpoint: 'sm', collapsed: { desktop: !dockOpen, mobile: true } }
      }
      padding={0}
    >
      <AppShell.Header>
        <TopBar />
      </AppShell.Header>
      <SearchSpotlight />
      {!isMobile && (
        <AppShell.Aside>
          <AnalysisDock />
        </AppShell.Aside>
      )}
      <AppShell.Main style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
        <Viewport isMobile={isMobile} />
      </AppShell.Main>
      {!isMobile && (
        <AppShell.Footer>
          <AttributionBar />
        </AppShell.Footer>
      )}
    </AppShell>
  )
}
