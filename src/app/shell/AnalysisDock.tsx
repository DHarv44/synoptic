import { ScrollArea, Stack, Tabs, Text } from '@mantine/core'
import { listFeatures } from '@/core/settings/registry'
import { useSettings } from '@/core/settings/store'
import type { PanelContribution } from '@/core/settings/types'

interface DockPanel extends PanelContribution {
  featureId: string
}

/** Analysis dock (right): tabs contributed by enabled features. */
export function AnalysisDock() {
  // Subscribe so enable/disable updates the tab set live.
  const featureStates = useSettings((s) => s.features)

  const panels: DockPanel[] = listFeatures()
    .filter((f) => featureStates[f.id]?.enabled ?? f.defaultEnabled ?? true)
    .flatMap((f) => (f.panels ?? []).map((p) => ({ ...p, featureId: f.id })))

  if (panels.length === 0) {
    return (
      <Stack p="sm">
        <Text size="xs" c="dimmed">
          No analysis panels enabled.
        </Text>
      </Stack>
    )
  }

  return (
    <Tabs defaultValue={panels[0].id} h="100%" display="flex" style={{ flexDirection: 'column' }}>
      <Tabs.List>
        {panels.map((p) => (
          <Tabs.Tab key={p.id} value={p.id} fz="xs">
            {p.title}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {panels.map((p) => {
        const Panel = p.component
        return (
          <Tabs.Panel key={p.id} value={p.id} flex={1} style={{ minHeight: 0 }}>
            <ScrollArea h="100%" p="sm">
              <Panel />
            </ScrollArea>
          </Tabs.Panel>
        )
      })}
    </Tabs>
  )
}
