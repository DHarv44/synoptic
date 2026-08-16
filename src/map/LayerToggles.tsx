import { useRef, useState } from 'react'
import { ActionIcon, Popover, Slider, Stack, Text, Tooltip } from '@mantine/core'
import { listFeatures } from '@/core/settings/registry'
import { useFeatureEnabled, useFeatureOption, useSettings } from '@/core/settings/store'
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
  const setOption = useSettings((s) => s.setOption)
  const opacity = useFeatureOption<number>(manifest.id, 'opacity')
  const health = useWorstHealth(manifest.sourceIds)
  const Icon = manifest.layerIcon

  // Hover flyout state, kept open while the pointer is over icon OR flyout.
  const [hovered, setHovered] = useState(false)
  const closeTimer = useRef<number | undefined>(undefined)
  const openNow = (): void => {
    window.clearTimeout(closeTimer.current)
    setHovered(true)
  }
  const closeSoon = (): void => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setHovered(false), 150)
  }

  const opacityField = manifest.settings?.find(
    (s) => s.kind === 'number' && s.key === 'opacity',
  )

  const age = health?.lastSuccess !== undefined ? ` · ${fmtUtcTime(health.lastSuccess)}` : ''
  const label = enabled
    ? `${manifest.title}${health ? ` — ${health.status}${age}` : ''}`
    : `${manifest.title} (off)`

  const button = (
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
  )

  // No opacity to offer (or layer off): the plain tooltip carries the label.
  if (opacityField === undefined || opacityField.kind !== 'number' || !enabled) {
    return (
      <Tooltip label={label} position="left" openDelay={200}>
        {button}
      </Tooltip>
    )
  }

  // One hover surface for label AND slider — a Tooltip and a flyout would
  // fight for the same spot to the left of the rail.
  return (
    <Popover opened={hovered} position="left" offset={6} shadow="md" withinPortal>
      <Popover.Target>
        <div onMouseEnter={openNow} onMouseLeave={closeSoon}>
          {button}
        </div>
      </Popover.Target>
      <Popover.Dropdown p="xs" onMouseEnter={openNow} onMouseLeave={closeSoon}>
        <Text size="xs" c="dimmed" mb={6}>
          {label}
        </Text>
        <Slider
          w={130}
          size="xs"
          min={opacityField.min}
          max={opacityField.max}
          step={opacityField.step}
          value={opacity}
          onChange={(v) => setOption(manifest.id, 'opacity', v)}
          label={(v) => `${v}%`}
          aria-label={`${manifest.title} opacity`}
        />
      </Popover.Dropdown>
    </Popover>
  )
}

/**
 * Layer visibility toggles, grouped by kind. Visibility is an operation you
 * perform while working; opacity, colour tables and products are
 * preferences and live in Settings.
 */
export function LayerToggles() {
  const layers = listFeatures().filter((f) => f.layer)

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
