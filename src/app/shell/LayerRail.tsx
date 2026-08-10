import { Group, Slider, Stack, Switch, Text, Tooltip } from '@mantine/core'
import { listFeatures } from '@/core/settings/registry'
import { useSettings, useFeatureEnabled, useFeatureOption } from '@/core/settings/store'
import { useHealth } from '@/core/data/healthStore'
import { fmtUtcTime } from '@/core/time/format'
import type { FeatureManifest } from '@/core/settings/types'
import type { SourceHealth } from '@/core/data/types'

const STATUS_COLOR: Record<SourceHealth['status'], string> = {
  idle: 'var(--mantine-color-gray-6)',
  ok: 'var(--mantine-color-green-6)',
  stale: 'var(--mantine-color-yellow-6)',
  error: 'var(--mantine-color-red-6)',
  disabled: 'var(--mantine-color-gray-7)',
}

function HealthBadge({ sourceIds }: { sourceIds: string[] }) {
  const sources = useHealth((s) => s.sources)
  const mine = sourceIds.map((id) => sources[id]).filter((s): s is SourceHealth => s !== undefined)
  if (mine.length === 0) return null
  const worst =
    mine.find((s) => s.status === 'error') ??
    mine.find((s) => s.status === 'stale') ??
    mine[0]
  const age = worst.lastSuccess !== undefined ? ` · ${fmtUtcTime(worst.lastSuccess)}` : ''
  return (
    <Tooltip label={`${worst.label}: ${worst.status}${age}`}>
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          background: STATUS_COLOR[worst.status],
          flexShrink: 0,
        }}
      />
    </Tooltip>
  )
}

function OpacitySlider({ featureId }: { featureId: string }) {
  const value = useFeatureOption<number>(featureId, 'opacity')
  const setOption = useSettings((s) => s.setOption)
  return (
    <Slider
      size="xs"
      min={10}
      max={100}
      step={5}
      value={value}
      onChange={(v) => setOption(featureId, 'opacity', v)}
      label={(v) => `${v}%`}
      aria-label={`${featureId} opacity`}
      ml={30}
    />
  )
}

function RailEntry({ manifest }: { manifest: FeatureManifest }) {
  const enabled = useFeatureEnabled(manifest.id)
  const setEnabled = useSettings((s) => s.setEnabled)
  const hasOpacity = manifest.settings.some((f) => f.key === 'opacity')

  return (
    <Stack gap={2} opacity={enabled ? 1 : 0.55}>
      <Group gap={6} wrap="nowrap" justify="space-between">
        <Switch
          size="xs"
          label={manifest.title}
          checked={enabled}
          onChange={(e) => setEnabled(manifest.id, e.currentTarget.checked)}
        />
        {enabled && manifest.sourceIds && <HealthBadge sourceIds={manifest.sourceIds} />}
      </Group>
      {enabled && hasOpacity && <OpacitySlider featureId={manifest.id} />}
    </Stack>
  )
}

/** Layer stack (left rail): toggles, opacity, and per-source health badges. */
export function LayerRail() {
  const layers = listFeatures().filter((f) => f.layer)

  return (
    <Stack p="sm" gap="sm">
      <Text size="xs" tt="uppercase" c="dimmed" fw={600} lts={1}>
        Layers
      </Text>
      {layers.map((f) => (
        <RailEntry key={f.id} manifest={f} />
      ))}
    </Stack>
  )
}
