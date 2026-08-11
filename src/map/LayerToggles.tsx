import { ActionIcon, Group, Stack, Switch, Text, Tooltip, UnstyledButton } from '@mantine/core'
import { listFeatures } from '@/core/settings/registry'
import { useFeatureEnabled, useSettings } from '@/core/settings/store'
import { useHealth } from '@/core/data/healthStore'
import { fmtUtcTime } from '@/core/time/format'
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
  return mine.find((s) => s.status === 'error') ?? mine.find((s) => s.status === 'stale') ?? mine[0]
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
        variant="subtle"
        color="gray"
        aria-label={`${manifest.title} layer`}
        aria-pressed={enabled}
        onClick={() => setEnabled(manifest.id, !enabled)}
        style={{
          position: 'relative',
          width: '100%',
          height: 34,
          color: enabled ? 'var(--mantine-color-text)' : 'var(--mantine-color-dimmed)',
          opacity: enabled ? 1 : 0.45,
        }}
      >
        {Icon ? <Icon size={17} stroke={1.6} /> : <Text size="xs">{manifest.title[0]}</Text>}
        {enabled && health && (
          <div
            style={{
              position: 'absolute',
              right: 5,
              bottom: 5,
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
 * Layer visibility toggles, grouped by kind. Visibility is an operation you
 * perform while working; opacity, colour tables and products are
 * preferences and live in Settings.
 */
export function LayerToggles({ horizontal = false }: { horizontal?: boolean }) {
  const layers = listFeatures().filter((f) => f.layer)

  if (horizontal) {
    // Mobile sheet: labelled rows are easier to hit and read than icons.
    return (
      <Stack gap={2}>
        {GROUP_ORDER.flatMap((group) =>
          layers.filter((f) => (f.layerGroup ?? 'reference') === group),
        ).map((f) => (
          <LayerRow key={f.id} manifest={f} />
        ))}
      </Stack>
    )
  }

  return (
    <Stack gap={4} align="center" px={2}>
      {GROUP_ORDER.map((group, i) => {
        const inGroup = layers.filter((f) => (f.layerGroup ?? 'reference') === group)
        if (inGroup.length === 0) return null
        return (
          <Stack
            key={group}
            gap={0}
            align="center"
            w="100%"
            style={
              i > 0
                ? { borderTop: '1px solid var(--mantine-color-default-border)', paddingTop: 4 }
                : undefined
            }
          >
            {inGroup.map((f) => (
              <LayerButton key={f.id} manifest={f} />
            ))}
          </Stack>
        )
      })}
    </Stack>
  )
}

/** Full-width labelled toggle for the mobile layers sheet. */
function LayerRow({ manifest }: { manifest: FeatureManifest }) {
  const enabled = useFeatureEnabled(manifest.id)
  const setEnabled = useSettings((s) => s.setEnabled)
  const health = useWorstHealth(manifest.sourceIds)
  const Icon = manifest.layerIcon

  return (
    <UnstyledButton
      onClick={() => setEnabled(manifest.id, !enabled)}
      aria-pressed={enabled}
      style={{ padding: '10px 4px', borderRadius: 6 }}
    >
      <Group gap="sm" wrap="nowrap">
        <div style={{ color: enabled ? 'var(--mantine-color-text)' : 'var(--mantine-color-dimmed)' }}>
          {Icon ? <Icon size={19} stroke={1.6} /> : null}
        </div>
        <Text size="sm" c={enabled ? undefined : 'dimmed'} style={{ flex: 1 }}>
          {manifest.title}
        </Text>
        {enabled && health && (
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: STATUS_COLOR[health.status],
            }}
          />
        )}
        <Switch size="xs" checked={enabled} readOnly tabIndex={-1} />
      </Group>
    </UnstyledButton>
  )
}
