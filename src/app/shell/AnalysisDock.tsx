import { useState } from 'react'
import { ScrollArea, SegmentedControl, Stack, Tabs, Text } from '@mantine/core'
import { listFeatures } from '@/core/settings/registry'
import { useSettings } from '@/core/settings/store'
import type { PanelContribution, PanelGroup } from '@/core/settings/types'

const GROUPS: Array<{ key: PanelGroup; label: string; empty: string }> = [
  {
    key: 'place',
    label: 'Place',
    empty: 'Click anywhere on the map for conditions, forecast, and a sounding.',
  },
  { key: 'nearby', label: 'Nearby', empty: 'No active weather in view.' },
  { key: 'radar', label: 'Radar', empty: 'Zoom in to a radar site for interrogation tools.' },
]

function GroupContent({ panels, empty }: { panels: PanelContribution[]; empty: string }) {
  const [active, setActive] = useState(panels[0]?.id)
  if (panels.length === 0) {
    return (
      <Text size="xs" c="dimmed" p="sm">
        {empty}
      </Text>
    )
  }
  const current = panels.find((p) => p.id === active) ?? panels[0]
  const Panel = current.component

  return (
    <Stack gap="xs" h="100%" style={{ minHeight: 0 }}>
      {panels.length > 1 && (
        <SegmentedControl
          size="xs"
          fullWidth
          value={current.id}
          onChange={setActive}
          data={panels.map((p) => ({ value: p.id, label: p.title }))}
        />
      )}
      <ScrollArea flex={1} style={{ minHeight: 0 }}>
        <Panel />
      </ScrollArea>
    </Stack>
  )
}

/**
 * Analysis dock, three top-level sections by mental model: Place answers
 * "tell me about this point", Nearby answers "what's happening around here",
 * Radar holds the storm-interrogation tools.
 */
export function AnalysisDock() {
  // Subscribe so enable/disable updates the panel set live.
  const featureStates = useSettings((s) => s.features)

  const panelsFor = (group: PanelGroup): PanelContribution[] =>
    listFeatures()
      .filter((f) => featureStates[f.id]?.enabled ?? f.defaultEnabled ?? true)
      .flatMap((f) => f.panels ?? [])
      .filter((p) => p.group === group)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  return (
    <Tabs defaultValue="place" h="100%" display="flex" style={{ flexDirection: 'column' }}>
      <Tabs.List grow>
        {GROUPS.map((g) => (
          <Tabs.Tab key={g.key} value={g.key} fz="xs">
            {g.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {GROUPS.map((g) => (
        <Tabs.Panel key={g.key} value={g.key} flex={1} p="xs" style={{ minHeight: 0 }}>
          <GroupContent panels={panelsFor(g.key)} empty={g.empty} />
        </Tabs.Panel>
      ))}
    </Tabs>
  )
}
