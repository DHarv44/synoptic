import { useState } from 'react'
import { Group, SegmentedControl, Stack, Switch, Text } from '@mantine/core'
import { useProbe } from '@/core/probe/store'
import { PanelGuard } from '@/ui/PanelGuard'
import { PanelHeader } from '@/ui/PanelHeader'
import { LegendDot } from '@/ui/LegendDot'
import { MODELS, MODEL_VARS } from '@/core/data/openMeteo/models'
import { useEnsemble, useModels } from '@/core/data/openMeteo/useModels'
import { ModelsChart } from '@/features/models/ModelsChart'

/** Multi-model comparison: 5 global models + optional GFS ensemble. */
export function ModelsPanel() {
  const point = useProbe((s) => s.point)
  const [varKey, setVarKey] = useState<string>('temperature_2m')
  const [showEnsemble, setShowEnsemble] = useState(false)
  const models = useModels()
  const ensemble = useEnsemble(showEnsemble)

  return (
    <PanelGuard error={models.error} loading={models.loading || (point !== null && !models.data)}>
      {point && models.data && (
        <Stack gap="xs">
          <PanelHeader suffix="10 days" />
          <SegmentedControl
            size="xs"
            fullWidth
            value={varKey}
            onChange={setVarKey}
            data={MODEL_VARS.map((v) => ({ value: v.key, label: v.label }))}
          />
          <ModelsChart
            data={models.data}
            ensemble={showEnsemble ? ensemble.data : null}
            varKey={varKey}
          />
          <Group gap="sm">
            {MODELS.map((m) => (
              <LegendDot key={m.key} color={m.color} label={m.label} />
            ))}
          </Group>
          <Switch
            size="xs"
            label="GFS ensemble members (temp only)"
            checked={showEnsemble}
            onChange={(e) => setShowEnsemble(e.currentTarget.checked)}
          />
          <Text size="xs" c="dimmed">
            Model spread = forecast uncertainty. Lines end where a model's
            horizon does; ECMWF is 3-hourly.
          </Text>
        </Stack>
      )}
    </PanelGuard>
  )
}
