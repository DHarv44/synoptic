import { Badge, Stack, Tooltip, UnstyledButton } from '@mantine/core'
import {
  IconAdjustments,
  IconAlertTriangle,
  IconMapPin,
  IconRadar,
  type IconProps,
} from '@tabler/icons-react'
import type { ComponentType } from 'react'
import { useDock, type DockTab } from '@/app/shell/dockStore'
import { mapChromeStyle } from '@/ui/mapChrome'

export interface RailTab {
  key: DockTab
  label: string
  icon: ComponentType<IconProps>
}

export const RAIL_TABS: RailTab[] = [
  { key: 'place', label: 'Location', icon: IconMapPin },
  { key: 'nearby', label: 'Nearby', icon: IconAlertTriangle },
  { key: 'radar', label: 'Radar', icon: IconRadar },
  { key: 'settings', label: 'Settings', icon: IconAdjustments },
]

const RAIL_WIDTH = 44

function RailButton({ tab, indicator }: { tab: RailTab; indicator?: number | 'live' }) {
  const open = useDock((s) => s.open)
  const active = useDock((s) => s.tab === tab.key && s.open)
  const toggleTab = useDock((s) => s.toggleTab)
  const Icon = tab.icon

  return (
    <Tooltip
      label={active ? `Hide ${tab.label}` : tab.label}
      position="left"
      openDelay={300}
    >
      <UnstyledButton
        onClick={() => toggleTab(tab.key)}
        aria-label={tab.label}
        aria-pressed={active}
        aria-expanded={open}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: RAIL_WIDTH,
          height: 44,
          color: active ? 'var(--mantine-color-text)' : 'var(--mantine-color-dimmed)',
          background: active ? 'var(--mantine-color-default-hover)' : 'transparent',
          boxShadow: active ? 'inset 2px 0 0 var(--mantine-primary-color-filled)' : 'none',
        }}
      >
        <Icon size={19} stroke={1.6} />
        {indicator === 'live' && (
          <div
            style={{
              position: 'absolute',
              top: 9,
              right: 7,
              width: 6,
              height: 6,
              borderRadius: 3,
              background: 'var(--mantine-color-green-6)',
            }}
          />
        )}
        {typeof indicator === 'number' && indicator > 0 && (
          <Badge size="xs" circle color="red" style={{ position: 'absolute', top: 5, right: 3 }}>
            {indicator > 99 ? '99' : indicator}
          </Badge>
        )}
      </UnstyledButton>
    </Tooltip>
  )
}

/**
 * Persistent tab rail on the right edge. It stays visible when the panel is
 * collapsed — clicking the active tab hides the panel, clicking any other
 * shows it. No separate collapse/expand buttons.
 */
export function DockRail({
  indicators = {},
}: {
  indicators?: Partial<Record<DockTab, number | 'live'>>
}) {
  return (
    <Stack
      gap={0}
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: RAIL_WIDTH,
        zIndex: 6,
        ...mapChromeStyle,
        borderLeft: '1px solid var(--mantine-color-default-border)',
        boxShadow: 'none',
      }}
    >
      {RAIL_TABS.map((t) => (
        <RailButton key={t.key} tab={t} indicator={indicators[t.key]} />
      ))}
    </Stack>
  )
}
