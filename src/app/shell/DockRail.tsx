import { Badge, Group, Stack, Tooltip, UnstyledButton } from '@mantine/core'
import {
  IconAdjustments,
  IconAlertTriangle,
  IconMapPin,
  IconRadar,
  type IconProps,
} from '@tabler/icons-react'
import type { ComponentType } from 'react'
import { useDock, type DockTab } from '@/app/shell/dockStore'

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

interface DockRailProps {
  /** Badge counts / live dots per tab, e.g. active warnings. */
  indicators?: Partial<Record<DockTab, number | 'live'>>
  horizontal?: boolean
}

function RailButton({
  tab,
  indicator,
  horizontal,
}: {
  tab: RailTab
  indicator?: number | 'live'
  horizontal: boolean
}) {
  const active = useDock((s) => s.tab) === tab.key
  const setTab = useDock((s) => s.setTab)
  const Icon = tab.icon

  return (
    <Tooltip label={tab.label} position={horizontal ? 'bottom' : 'left'} openDelay={300}>
      <UnstyledButton
        onClick={() => setTab(tab.key)}
        aria-label={tab.label}
        aria-current={active}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: horizontal ? '100%' : 40,
          height: 42,
          color: active ? 'var(--mantine-color-text)' : 'var(--mantine-color-dimmed)',
          background: active ? 'var(--mantine-color-default-hover)' : 'transparent',
          // Accent marks the active tab on the outer edge of the rail.
          boxShadow: active
            ? horizontal
              ? 'inset 0 2px 0 var(--mantine-primary-color-filled)'
              : 'inset 2px 0 0 var(--mantine-primary-color-filled)'
            : 'none',
        }}
      >
        <Icon size={19} stroke={1.6} />
        {indicator === 'live' && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: horizontal ? 'calc(50% - 14px)' : 6,
              width: 6,
              height: 6,
              borderRadius: 3,
              background: 'var(--mantine-color-green-6)',
            }}
          />
        )}
        {typeof indicator === 'number' && indicator > 0 && (
          <Badge
            size="xs"
            circle
            color="red"
            style={{ position: 'absolute', top: 4, right: horizontal ? 'calc(50% - 20px)' : 2 }}
          >
            {indicator > 99 ? '99' : indicator}
          </Badge>
        )}
      </UnstyledButton>
    </Tooltip>
  )
}

/** Tab rail: vertical beside the dock on desktop, horizontal above it on mobile. */
export function DockRail({ indicators = {}, horizontal = false }: DockRailProps) {
  const Container = horizontal ? Group : Stack
  return (
    <Container
      gap={0}
      wrap="nowrap"
      style={{
        flexShrink: 0,
        borderRight: horizontal ? undefined : '1px solid var(--mantine-color-default-border)',
        borderBottom: horizontal ? '1px solid var(--mantine-color-default-border)' : undefined,
      }}
    >
      {RAIL_TABS.map((t) => (
        <RailButton key={t.key} tab={t} indicator={indicators[t.key]} horizontal={horizontal} />
      ))}
    </Container>
  )
}
