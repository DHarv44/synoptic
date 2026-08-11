import { ActionIcon, Group, ScrollArea, Stack, Text, UnstyledButton } from '@mantine/core'
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { useDock, type SheetState } from '@/app/shell/dockStore'
import { RAIL_TABS } from '@/app/shell/DockRail'
import { ContextHeader, DockContent } from '@/app/shell/AnalysisDock'
import { mapChromeStyle } from '@/ui/mapChrome'

export const TAB_BAR_HEIGHT = 56

const SHEET_HEIGHT: Record<SheetState, string> = {
  peek: `${TAB_BAR_HEIGHT}px`,
  half: '54dvh',
  full: 'calc(100dvh - 44px)',
}

/** Bottom tab bar — always visible, thumb-reachable, fixed height. */
function TabBar() {
  const tab = useDock((s) => s.tab)
  const sheet = useDock((s) => s.sheet)
  const pressTab = useDock((s) => s.pressTab)

  return (
    <Group
      gap={0}
      grow
      wrap="nowrap"
      style={{
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
}

/**
 * Mobile panel: a bottom tab bar pinned to the screen edge with panel
 * content stacked above it. Peek is the bar alone (map keeps the screen);
 * half shows content with the map still visible; full hands the screen
 * over. Tapping the active tab returns to peek.
 * (Drag-to-resize is on the roadmap — tap to cycle for now.)
 */
export function MobileSheet() {
  const tab = useDock((s) => s.tab)
  const sheet = useDock((s) => s.sheet)
  const setSheet = useDock((s) => s.setSheet)

  const grow: Partial<Record<SheetState, SheetState>> = { half: 'full' }
  const shrink: Partial<Record<SheetState, SheetState>> = { full: 'half', half: 'peek' }

  return (
    <Stack
      gap={0}
      style={{
        ...mapChromeStyle,
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: SHEET_HEIGHT[sheet],
        zIndex: 7,
        borderTop: '1px solid var(--mantine-color-default-border)',
        transition: 'height 160ms ease',
      }}
    >
      {sheet !== 'peek' && (
        <>
          <Group gap={0} wrap="nowrap" justify="space-between" pr={4} style={{ flexShrink: 0 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <ContextHeader tab={tab} />
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
          <ScrollArea flex={1} style={{ minHeight: 0 }} px="xs">
            <DockContent tab={tab} />
          </ScrollArea>
        </>
      )}
      <TabBar />
    </Stack>
  )
}
