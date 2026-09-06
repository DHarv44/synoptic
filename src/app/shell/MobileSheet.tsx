import { memo, useEffect, useRef } from 'react'
import { ActionIcon, Group, ScrollArea, Stack, Text, UnstyledButton } from '@mantine/core'
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { useCameraStore } from '@/map/cameraStore'
import { useDock, type SheetState } from '@/app/shell/dockStore'
import { RAIL_TABS } from '@/app/shell/DockRail'
import { ContextHeader, DockContent } from '@/app/shell/AnalysisDock'
import { SHEET_CSS_HEIGHT, TAB_BAR_HEIGHT } from '@/app/shell/sheetSnap'
import { useSheetDrag, type SheetDrag } from '@/app/shell/useSheetDrag'
import { mapChromeStyle } from '@/ui/mapChrome'

export { TAB_BAR_HEIGHT } from '@/app/shell/sheetSnap'

// The sheet re-renders on every drag frame; the panel body must not.
const Content = memo(DockContent)
const Header = memo(ContextHeader)

/** Bottom tab bar — always visible, thumb-reachable, fixed height. */
const TabBar = memo(function TabBar({ drag }: { drag: SheetDrag['surfaceProps'] }) {
  const tab = useDock((s) => s.tab)
  const sheet = useDock((s) => s.sheet)
  const pressTab = useDock((s) => s.pressTab)

  return (
    <Group
      gap={0}
      grow
      wrap="nowrap"
      onPointerDown={drag.onPointerDown}
      style={{
        ...drag.style,
        height: TAB_BAR_HEIGHT,
        flexShrink: 0,
        borderTop: '1px solid var(--mantine-color-default-border)',
      }}
    >
      {RAIL_TABS.map((t) => {
        const Icon = t.icon
        const active = tab === t.key && sheet !== 'peek'
        return (
          <UnstyledButton
            key={t.key}
            onClick={() => pressTab(t.key)}
            aria-label={t.label}
            aria-pressed={active}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              height: '100%',
              padding: '0 4px',
              color: active ? 'var(--mantine-color-text)' : 'var(--mantine-color-dimmed)',
              boxShadow: active ? 'inset 0 2px 0 var(--mantine-primary-color-filled)' : 'none',
            }}
          >
            <Icon size={20} stroke={1.6} />
            <Text size="xs" lh={1}>
              {t.label}
            </Text>
          </UnstyledButton>
        )
      })}
    </Group>
  )
})

/** The pill that says "drag me". */
function GrabHandle() {
  return (
    <div
      aria-hidden
      style={{
        width: 36,
        height: 4,
        borderRadius: 2,
        margin: '6px auto 0',
        background: 'var(--mantine-color-default-border)',
      }}
    />
  )
}

/**
 * Mobile panel: a bottom tab bar pinned to the screen edge with panel
 * content stacked above it. Peek is the bar alone (map keeps the screen);
 * half shows content with the map still visible; full hands the screen
 * over. Tapping the active tab returns to peek; dragging the header or the
 * tab bar moves the sheet live and snaps it to the nearest detent.
 */
export function MobileSheet() {
  const tab = useDock((s) => s.tab)
  const sheet = useDock((s) => s.sheet)
  const setSheet = useDock((s) => s.setSheet)
  const rootRef = useRef<HTMLDivElement>(null)
  const drag = useSheetDrag(rootRef, setSheet)

  // A panel row that flies the map wants the map SEEN. On desktop the dock
  // sits beside the viewport; here it covers it, so any camera request from
  // inside the sheet collapses it back to the tab bar.
  const flyTarget = useCameraStore((s) => s.target)
  const fitTarget = useCameraStore((s) => s.fit)
  useEffect(() => {
    if (flyTarget === null && fitTarget === null) return
    if (useDock.getState().sheet !== 'peek') setSheet('peek')
  }, [flyTarget, fitTarget, setSheet])

  const grow: Partial<Record<SheetState, SheetState>> = { half: 'full' }
  const shrink: Partial<Record<SheetState, SheetState>> = { full: 'half', half: 'peek' }

  const dragging = drag.height !== null
  // Mid-drag the sheet shows content once past the bar, whatever the state.
  const open = dragging ? (drag.height as number) > TAB_BAR_HEIGHT + 8 : sheet !== 'peek'

  return (
    <Stack
      ref={rootRef}
      gap={0}
      onClickCapture={drag.onClickCapture}
      style={{
        ...mapChromeStyle,
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: dragging ? `${drag.height}px` : SHEET_CSS_HEIGHT[sheet],
        zIndex: 7,
        borderTop: '1px solid var(--mantine-color-default-border)',
        transition: dragging ? 'none' : 'height 160ms ease',
      }}
    >
      {open && (
        <>
          <div onPointerDown={drag.surfaceProps.onPointerDown} style={{ ...drag.surfaceProps.style, flexShrink: 0 }}>
            <GrabHandle />
            <Group gap={0} wrap="nowrap" justify="space-between" pr={4}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Header tab={tab} />
              </div>
            <Group gap={0} wrap="nowrap">
              {shrink[sheet] && (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label="Shrink panel"
                  onClick={() => setSheet(shrink[sheet] as SheetState)}
                >
                  <IconChevronDown size={16} stroke={1.7} />
                </ActionIcon>
              )}
              {grow[sheet] && (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label="Expand panel"
                  onClick={() => setSheet(grow[sheet] as SheetState)}
                >
                  <IconChevronUp size={16} stroke={1.7} />
                </ActionIcon>
              )}
            </Group>
          </Group>
          </div>
          <ScrollArea flex={1} style={{ minHeight: 0 }} px="xs">
            <Content tab={tab} />
          </ScrollArea>
        </>
      )}
      <TabBar drag={drag.surfaceProps} />
    </Stack>
  )
}
