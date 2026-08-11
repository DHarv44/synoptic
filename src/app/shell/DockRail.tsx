import { Stack, Tooltip, UnstyledButton } from '@mantine/core'
import {
  IconAdjustments,
  IconAlertTriangle,
  IconHelp,
  IconMapPin,
  IconRadar,
  type IconProps,
} from '@tabler/icons-react'
import type { ComponentType } from 'react'
import { useDock, type DockTab } from '@/app/shell/dockStore'
import { mapChromeStyle } from '@/ui/mapChrome'
import { LayerToggles } from '@/map/LayerToggles'
import { listFeatures } from '@/core/settings/registry'

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
  { key: 'help', label: 'Help', icon: IconHelp },
]

const RAIL_WIDTH = 44

/**
 * Indicator components contributed by features whose panels live under this
 * tab. Only one feature declares one today; if that changes they'd share a
 * corner, which is visible enough to prompt a layout decision then.
 */
function indicatorsFor(tab: DockTab): ComponentType[] {
  return listFeatures()
    .filter((f) => f.dockIndicator && f.panels?.some((p) => p.group === tab))
    .map((f) => f.dockIndicator as ComponentType)
}

function RailButton({ tab }: { tab: RailTab }) {
  const open = useDock((s) => s.open)
  const active = useDock((s) => s.tab === tab.key && s.open)
  const toggleTab = useDock((s) => s.toggleTab)
  const Icon = tab.icon
  const indicators = indicatorsFor(tab.key)

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
        {indicators.map((Indicator, i) => (
          <Indicator key={i} />
        ))}
      </UnstyledButton>
    </Tooltip>
  )
}

/**
 * Persistent tab rail on the right edge. It stays visible when the panel is
 * collapsed — clicking the active tab hides the panel, clicking any other
 * shows it. No separate collapse/expand buttons.
 */
export function DockRail() {
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
        <RailButton key={t.key} tab={t} />
      ))}
      {/* Layer visibility toggles sit at the foot of the same strip. */}
      <div style={{ flex: 1 }} />
      <div
        style={{
          borderTop: '1px solid var(--mantine-color-default-border)',
          paddingTop: 6,
          paddingBottom: 6,
        }}
      >
        <LayerToggles />
      </div>
    </Stack>
  )
}
