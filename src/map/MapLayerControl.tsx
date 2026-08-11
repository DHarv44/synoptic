import { ActionIcon, Stack, Text, Tooltip } from '@mantine/core'
import { IconSettings } from '@tabler/icons-react'
import { listFeatures } from '@/core/settings/registry'
import { useFeatureEnabled, useSettings } from '@/core/settings/store'
import { useHealth } from '@/core/data/healthStore'
import { fmtUtcTime } from '@/core/time/format'
import { mapChromeStyle } from '@/ui/mapChrome'
import { useDock } from '@/app/shell/dockStore'
import type { FeatureManifest, LayerGroup } from '@/core/settings/types'
import type { SourceHealth } from '@/core/data/types'

const GROUP_ORDER: LayerGroup[] = ['radar', 'observations', 'analysis', 'reference']

const STATUS_COLOR: Record<SourceHealth['status'], string> = {
  idle: 'var(--mantine-color-gray-6)',
  ok: 'var(--mantine-color-green-6)',
  stale: 'var(--mantine-color-yellow-6)',
  error: 'var(--mantine-color-red-6)',
  disabled: 'var(--mantine-color-gray-7)',
}

function useWorstHealth(sourceIds: string[] | undefined): SourceHealth | null {
  const sources = useHealth((s) => s.sources)
  if (!sourceIds) return null
  const mine = sourceIds.map((id) => sources[id]).filter((s): s is SourceHealth => s !== undefined)
  if (mine.length === 0) return null
  return (
    mine.find((s) => s.status === 'error') ?? mine.find((s) => s.status === 'stale') ?? mine[0]
  )
}

function LayerButton({ manifest }: { manifest: FeatureManifest }) {
  const enabled = useFeatureEnabled(manifest.id)
  const setEnabled = useSettings((s) => s.setEnabled)
  const health = useWorstHealth(manifest.sourceIds)
  const Icon = manifest.layerIcon

  const age = health?.lastSuccess !== undefined ? ` · ${fmtUtcTime(health.lastSuccess)}` : ''
  const label = enabled
    ? `${manifest.title}${health ? ` — ${health.status}${age}` : ''}`
    : `${manifest.title} (off)`

  return (
    <Tooltip label={label} position="left" openDelay={200}>
      <ActionIcon
        size="lg"
        variant="default"
        aria-label={`${manifest.title} layer`}
        aria-pressed={enabled}
        onClick={() => setEnabled(manifest.id, !enabled)}
        style={{
          ...mapChromeStyle,
          position: 'relative',
          color: enabled
            ? 'var(--mantine-color-text)'
            : 'var(--mantine-color-dimmed)',
          opacity: enabled ? 1 : 0.55,
        }}
      >
        {Icon ? <Icon size={18} stroke={1.6} /> : <Text size="xs">{manifest.title[0]}</Text>}
        {enabled && health && (
          <div
            style={{
              position: 'absolute',
              right: 3,
              bottom: 3,
              width: 5,
              height: 5,
              borderRadius: 3,
              background: STATUS_COLOR[health.status],
            }}
          />
        )}
      </ActionIcon>
    </Tooltip>
  )
}

/**
 * Standalone layer toggles down the right edge of the map: one button per
 * layer, single click on/off, grouped by kind with a status dot when a
 * layer's source is live. Visibility is an operation — opacity, colour
 * tables and products are preferences and live in Settings.
 */
export function MapLayerControl() {
  const layers = listFeatures().filter((f) => f.layer)
  const showSettings = useDock((s) => s.show)

  return (
    <Stack
      gap={6}
      // Offset clear of the dock rail pinned to the right edge.
      style={{ position: 'absolute', bottom: 34, right: 52, zIndex: 5 }}
      align="center"
    >
      {GROUP_ORDER.map((group) => {
        const inGroup = layers.filter((f) => (f.layerGroup ?? 'reference') === group)
        if (inGroup.length === 0) return null
        return (
          <Stack key={group} gap={3} align="center">
            {inGroup.map((f) => (
              <LayerButton key={f.id} manifest={f} />
            ))}
          </Stack>
        )
      })}
      <Tooltip label="Layer options & settings" position="left" openDelay={200}>
        <ActionIcon
          size="lg"
          variant="default"
          aria-label="Layer options"
          onClick={() => showSettings('settings')}
          style={{ ...mapChromeStyle, color: 'var(--mantine-color-dimmed)' }}
        >
          <IconSettings size={18} stroke={1.6} />
        </ActionIcon>
      </Tooltip>
    </Stack>
  )
}
