import { Group, Text } from '@mantine/core'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import { Sparkline } from '@/ui/Sparkline'
import { plumeTrend, type PlumePoint } from '@/features/volcanoes/plumeHistory'

/**
 * The plume top and where it is heading: "FL500 ↑ from FL300 at 05:30",
 * with a sparkline once history has built up. History accumulates while
 * the app runs — a first sighting has no trend and says only the level.
 */
export function PlumeTrend({
  points,
  compact = false,
}: {
  points: PlumePoint[]
  compact?: boolean
}) {
  const fmt = useTimeFormat()
  const tr = plumeTrend(points)
  if (!tr) return null
  const arrow = tr.delta > 0 ? '↑' : tr.delta < 0 ? '↓' : tr.previous ? '→' : ''
  return (
    <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
      {!compact && (
        <Text size="xs" c="dimmed">
          Plume top
        </Text>
      )}
      <Text size="xs" ff="monospace">
        FL{tr.latest.fl}
        {arrow && ` ${arrow}`}
      </Text>
      {!compact && tr.previous && (
        <Text size="xs" c="dimmed">
          from FL{tr.previous.fl} at {fmt.hm(tr.previous.t)}
        </Text>
      )}
      <Sparkline samples={points.map((p) => ({ x: p.t, y: p.fl }))} />
    </Group>
  )
}
