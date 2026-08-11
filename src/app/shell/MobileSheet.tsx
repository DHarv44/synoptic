import { ActionIcon, Badge, Group, ScrollArea, Stack, Text, UnstyledButton } from '@mantine/core'
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { useDock, type DockTab, type SheetState } from '@/app/shell/dockStore'
import { RAIL_TABS } from '@/app/shell/DockRail'
import { ContextHeader, DockContent } from '@/app/shell/AnalysisDock'
import { mapChromeStyle } from '@/ui/mapChrome'

const HEIGHT: Record<SheetState, string> = {
  peek: '92px',
  half: '52dvh',
  full: 'calc(100dvh - 44px)',
}

/** Tab strip inside the sheet handle — always visible, thumb-reachable. */
function SheetTabs() {
  const tab = useDock((s) => s.tab)
  const sheet = useDock((s) => s.sheet)
  const pressTab = useDock((s) => s.pressTab)

  return (
    <Group gap={0} grow wrap="nowrap">
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
              gap: 2,
              paddingBlock: 6,
              color: active ? 'var(--mantine-color-text)' : 'var(--mantine-color-dimmed)',
              boxShadow: active ? 'inset 0 2px 0 var(--mantine-primary-color-filled)' : 'none',
            }}
          >
            <Icon size={19} stroke={1.6} />
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
 * Mobile panel: a bottom sheet with three heights. Peek keeps the map and
 * shows the tabs; half shows panel content with the map still visible;
 * full hands the screen over for deep work. Tapping the active tab
 * returns to peek. (Drag-to-resize is planned — see the roadmap.)
 */
export function MobileSheet() {
  const tab = useDock((s) => s.tab)
  const sheet = useDock((s) => s.sheet)
  const setSheet = useDock((s) => s.setSheet)

  const grow: Partial<Record<SheetState, SheetState>> = { peek: 'half', half: 'full' }
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
        height: HEIGHT[sheet],
        zIndex: 7,
        borderTop: '1px solid var(--mantine-color-default-border)',
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        transition: 'height 160ms ease',
      }}
    >
      <SheetTabs />
      {sheet !== 'peek' && (
        <>
          <Group gap={0} wrap="nowrap" justify="space-between" pr={4}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <ContextHeader tab={tab as DockTab} />
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
      {sheet === 'peek' && (
        <Badge
          size="xs"
          variant="transparent"
          c="dimmed"
          style={{ alignSelf: 'center', pointerEvents: 'none' }}
        >
          tap a tab to open
        </Badge>
      )}
    </Stack>
  )
}
