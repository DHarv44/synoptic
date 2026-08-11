import { Group, ScrollArea, Stack, Text } from '@mantine/core'
import { listFeatures } from '@/core/settings/registry'
import { useSettings } from '@/core/settings/store'
import { useProbe } from '@/core/probe/store'
import { fmtLatLon } from '@/core/units/format'
import { applyOrder, useDock, type DockTab } from '@/app/shell/dockStore'
import { RAIL_TABS } from '@/app/shell/DockRail'
import { DockSection } from '@/app/shell/DockSection'
import { SettingsPanel } from '@/app/settings/SettingsPanel'
import type { PanelContribution, PanelGroup } from '@/core/settings/types'

const EMPTY: Record<PanelGroup, string> = {
  place: 'Click anywhere on the map to analyse that point.',
  nearby: 'No active warnings or storm cells in view.',
  radar: 'Zoom in to a radar site for interrogation tools.',
}

/** Contextual header: what this tab is currently about. */
function ContextHeader({ tab }: { tab: DockTab }) {
  const point = useProbe((s) => s.point)
  const label = RAIL_TABS.find((t) => t.key === tab)?.label ?? ''

  return (
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
  )
}

function SectionStack({ tab, panels }: { tab: PanelGroup; panels: PanelContribution[] }) {
  const savedOrder = useDock((s) => s.order[tab])
  const ids = applyOrder(
    savedOrder,
    panels.map((p) => p.id),
  )
  const ordered = ids
    .map((id) => panels.find((p) => p.id === id))
    .filter((p): p is PanelContribution => p !== undefined)

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
          <DockSection
            key={p.id}
            id={p.id}
            tab={tab}
            title={p.title}
            hint={Summary ? <Summary /> : undefined}
          >
            <Panel />
          </DockSection>
        )
      })}
    </Stack>
  )
}

/**
 * Analysis dock: a tab rail plus a single scrolling column of collapsible
 * sections. Sections start collapsed and can be reordered per tab, so the
 * panel adapts to whether you're monitoring, forecasting or interrogating.
 */
export function AnalysisDock() {
  // Subscribe so enable/disable updates the panel set live.
  const featureStates = useSettings((s) => s.features)
  const tab = useDock((s) => s.tab)

  const panelsFor = (group: PanelGroup): PanelContribution[] =>
    listFeatures()
      .filter((f) => featureStates[f.id]?.enabled ?? f.defaultEnabled ?? true)
      .flatMap((f) => f.panels ?? [])
      .filter((p) => p.group === group)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const body =
    tab === 'settings' ? <SettingsPanel /> : <SectionStack tab={tab} panels={panelsFor(tab)} />

  return (
    <Stack gap={0} h="100%" style={{ minHeight: 0 }}>
      <ContextHeader tab={tab} />
      <ScrollArea flex={1} style={{ minHeight: 0 }} px="xs">
        {body}
      </ScrollArea>
    </Stack>
  )
}
