import type { ReactNode } from 'react'
import { Group, Text } from '@mantine/core'
import { useProbe } from '@/core/probe/store'
import { fmtLatLon } from '@/core/units/format'

interface PanelHeaderProps {
  /** Right-aligned annotation (time, range, …). */
  right?: ReactNode
  /** Suffix appended after the location name. */
  suffix?: string
}

/** Standard analysis-panel header: probe location name + annotation. */
export function PanelHeader({ right, suffix }: PanelHeaderProps) {
  const point = useProbe((s) => s.point)
  if (!point) return null
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm" fw={600} truncate>
        {point.name ?? fmtLatLon(point.lat, point.lon)}
        {suffix ? ` · ${suffix}` : ''}
      </Text>
      {right && (
        <Text size="xs" ff="monospace" c="dimmed" style={{ flexShrink: 0 }}>
          {right}
        </Text>
      )}
    </Group>
  )
}
