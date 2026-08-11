import { ActionIcon, Divider, Group, Popover, Stack, Switch, Text, Tooltip } from '@mantine/core'
import { listFeatures } from '@/core/settings/registry'
import { useFeatureEnabled, useSettings } from '@/core/settings/store'
import { useHealth } from '@/core/data/healthStore'
import { fmtUtcTime } from '@/core/time/format'
import { mapChromeStyle } from '@/ui/mapChrome'
import type { FeatureManifest, LayerGroup } from '@/core/settings/types'
import type { SourceHealth } from '@/core/data/types'

const GROUP_ORDER: Array<{ key: LayerGroup; label: string }> = [
  { key: 'radar', label: 'Radar' },
  { key: 'observations', label: 'Observations' },
  { key: 'analysis', label: 'Analysis' },
  { key: 'reference', label: 'Reference' },
]

const STATUS_COLOR: Record<SourceHealth['status'], string> = {
  idle: 'var(--mantine-color-gray-6)',
  ok: 'var(--mantine-color-green-6)',
  stale: 'var(--mantine-color-yellow-6)',
  error: 'var(--mantine-color-red-6)',
  disabled: 'var(--mantine-color-gray-7)',
}

function HealthDot({ sourceIds }: { sourceIds: string[] }) {
  const sources = useHealth((s) => s.sources)
  const mine = sourceIds.map((id) => sources[id]).filter((s): s is SourceHealth => s !== undefined)
  if (mine.length === 0) return null
  const worst =
    mine.find((s) => s.status === 'error') ?? mine.find((s) => s.status === 'stale') ?? mine[0]
  const age = worst.lastSuccess !== undefined ? ` · ${fmtUtcTime(worst.lastSuccess)}` : ''
  return (
    <Tooltip label={`${worst.label}: ${worst.status}${age}`} position="left">
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

function LayerRow({ manifest }: { manifest: FeatureManifest }) {
  const enabled = useFeatureEnabled(manifest.id)
  const setEnabled = useSettings((s) => s.setEnabled)
  return (
    <Group gap={6} wrap="nowrap" justify="space-between">
      <Switch
        size="xs"
        label={manifest.title}
        checked={enabled}
        onChange={(e) => setEnabled(manifest.id, e.currentTarget.checked)}
      />
      {enabled && manifest.sourceIds && <HealthDot sourceIds={manifest.sourceIds} />}
    </Group>
  )
}

/**
 * Map layer toggles: visibility only. Opacity, colour tables and per-layer
 * options live in Settings — visibility is an operation you perform while
 * working, the rest are preferences you set once.
 */
export function MapLayerControl({ onOpenSettings }: { onOpenSettings: () => void }) {
  const layers = listFeatures().filter((f) => f.layer)
  const activeCount = useSettings(
    (s) => layers.filter((f) => s.features[f.id]?.enabled ?? f.defaultEnabled ?? true).length,
  )

  return (
    <Popover position="left-start" withinPortal shadow="md" offset={6}>
      <Popover.Target>
        <Tooltip label="Layers" position="left">
          <ActionIcon
            variant="default"
            size="lg"
            aria-label="Map layers"
            style={{ ...mapChromeStyle, position: 'absolute', top: 8, right: 8, zIndex: 5 }}
          >
            <Stack gap={0} align="center">
              <Text size="sm" lh={1}>
                ▤
              </Text>
              <Text size={'8px' as never} lh={1} c="dimmed">
                {activeCount}
              </Text>
            </Stack>
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown p="xs" style={mapChromeStyle}>
        <Stack gap={6} miw={190}>
          {GROUP_ORDER.map(({ key, label }) => {
            const group = layers.filter((f) => (f.layerGroup ?? 'reference') === key)
            if (group.length === 0) return null
            return (
              <Stack key={key} gap={4}>
                <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
                  {label}
                </Text>
                {group.map((f) => (
                  <LayerRow key={f.id} manifest={f} />
                ))}
              </Stack>
            )
          })}
          <Divider my={2} />
          <Text
            size="xs"
            c="dimmed"
            style={{ cursor: 'pointer' }}
            onClick={onOpenSettings}
          >
            ⚙ Layer options…
          </Text>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  )
}
