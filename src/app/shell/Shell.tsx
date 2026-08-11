import { useEffect } from 'react'
import { AppShell } from '@mantine/core'
import { useMediaQuery, useViewportSize } from '@mantine/hooks'
import { TopBar } from '@/app/shell/TopBar'
import { AnalysisDock } from '@/app/shell/AnalysisDock'
import { AttributionBar } from '@/app/shell/AttributionBar'
import { ToolPanel } from '@/app/shell/ToolPanel'
import { Viewport } from '@/app/shell/Viewport'
import { useDock } from '@/app/shell/dockStore'
import { useTools } from '@/app/shell/toolStore'
import { useActiveTool } from '@/app/shell/toolRegistry'
import { SearchSpotlight } from '@/features/search/SearchSpotlight'
import { useChromeOpacity } from '@/ui/useChromeOpacity'

export const MOBILE_QUERY = '(max-width: 48em)'

export function Shell() {
  const dockOpen = useDock((s) => s.open)
  const activeTool = useActiveTool()
  const toolPct = useTools((s) => s.widthPct)
  const isMobile = useMediaQuery(MOBILE_QUERY) ?? false
  const { width } = useViewportSize()
  useChromeOpacity()

  const toolOpen = !isMobile && activeTool !== null
  const toolWidth = Math.round((width * toolPct) / 100)

  // The map must re-measure whenever the panels change its width.
  useEffect(() => {
    const id = setTimeout(() => window.dispatchEvent(new Event('resize')), 180)
    return () => clearTimeout(id)
  }, [toolOpen, toolWidth, dockOpen])

  return (
    <AppShell
      header={{ height: 44 }}
      footer={isMobile ? undefined : { height: 26 }}
      navbar={
        toolOpen
          ? { width: toolWidth, breakpoint: 'sm', collapsed: { desktop: false, mobile: true } }
          : undefined
      }
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
      {toolOpen && (
        <AppShell.Navbar>
          <ToolPanel />
        </AppShell.Navbar>
      )}
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
