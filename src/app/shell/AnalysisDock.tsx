import { Group, ScrollArea, Stack, Text } from '@mantine/core'
import { listFeatures } from '@/core/settings/registry'
import { useSettings } from '@/core/settings/store'
import { useProbe } from '@/core/probe/store'
import { fmtLatLon } from '@/core/units/format'
import { useDock, type DockTab } from '@/app/shell/dockStore'
import { RAIL_TABS } from '@/app/shell/DockRail'
import { DockSection } from '@/app/shell/DockSection'
import { ForecastVerdict } from '@/features/forecast/ForecastVerdict'
import { SettingsPanel } from '@/app/settings/SettingsPanel'
import { HelpPanel } from '@/app/help/HelpPanel'
import type { PanelContribution, PanelGroup } from '@/core/settings/types'

const EMPTY: Record<PanelGroup, string> = {
  place: 'Click anywhere on the map to analyse that point.',
  nearby: 'No active warnings or storm cells in view.',
  radar: 'Zoom in to a radar site for interrogation tools.',
}

/** Contextual header: what this tab is currently about. */
export function ContextHeader({ tab }: { tab: DockTab }) {
  const point = useProbe((s) => s.point)
  const label = RAIL_TABS.find((t) => t.key === tab)?.label ?? ''

  return (
    <div>
      <Group justify="space-between" wrap="nowrap" px="xs" py={6}>
        <Text size="sm" fw={600} truncate>
          {tab === 'place' && point
            ? (point.name ?? fmtLatLon(point.lat, point.lon))
            : label}
        </Text>
        {tab === 'place' && point?.name && (
          <Text size="xs" c="dimmed" ff="monospace" style={{ flexShrink: 0 }}>
            {fmtLatLon(point.lat, point.lon)}
          </Text>
        )}
      </Group>
      {/* The verdict: the forecast in one line, before any section is opened. */}
      {tab === 'place' && point && <ForecastVerdict />}
    </div>
  )
}

function SectionStack({ tab, panels }: { tab: PanelGroup; panels: PanelContribution[] }) {
  const ordered = panels

  if (ordered.length === 0) {
    return (
      <Text size="xs" c="dimmed" p="sm">
        {EMPTY[tab]}
      </Text>
    )
  }

  return (
    <Stack gap={0}>
      {ordered.map((p) => {
        const Panel = p.component
        const Summary = p.summary
        return (
          <DockSection key={p.id} id={p.id} title={p.title} hint={Summary ? <Summary /> : undefined}>
            <Panel />
          </DockSection>
        )
      })}
    </Stack>
  )
}

/** The scrolling body for a tab — shared by the desktop dock and mobile sheet. */
export function DockContent({ tab }: { tab: DockTab }) {
  // Subscribe so enable/disable updates the panel set live.
  const featureStates = useSettings((s) => s.features)

  if (tab === 'settings') return <SettingsPanel />
  if (tab === 'help') return <HelpPanel />

  const panels = listFeatures()
    .filter((f) => featureStates[f.id]?.enabled ?? f.defaultEnabled ?? true)
    .flatMap((f) => f.panels ?? [])
    .filter((p) => p.group === tab)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  return <SectionStack tab={tab} panels={panels} />
}

/**
 * Analysis dock (desktop): a single scrolling column of collapsible
 * sections beside the map, with the tab rail pinned to the map's edge.
 */
export function AnalysisDock() {
  const tab = useDock((s) => s.tab)

  return (
    <Stack gap={0} h="100%" style={{ minHeight: 0 }}>
      <ContextHeader tab={tab} />
      <ScrollArea flex={1} style={{ minHeight: 0 }} px="xs">
        <DockContent tab={tab} />
      </ScrollArea>
    </Stack>
  )
}
