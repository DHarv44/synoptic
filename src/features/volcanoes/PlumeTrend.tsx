import { Group, Text } from '@mantine/core'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import { plumeTrend, type PlumePoint } from '@/features/volcanoes/plumeHistory'

const SPARK_W = 48
const SPARK_H = 12

/** Tiny plume-top line: only worth drawing once there are two points. */
function Sparkline({ points }: { points: PlumePoint[] }) {
  if (points.length < 2) return null
  const fls = points.map((p) => p.fl)
  const lo = Math.min(...fls)
  const hi = Math.max(...fls)
  const t0 = points[0].t
  const t1 = points[points.length - 1].t
  const x = (t: number): number => (t1 === t0 ? SPARK_W : ((t - t0) / (t1 - t0)) * SPARK_W)
  const y = (fl: number): number =>
    hi === lo ? SPARK_H / 2 : SPARK_H - 1 - ((fl - lo) / (hi - lo)) * (SPARK_H - 2)
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.fl).toFixed(1)}`).join(' ')
  return (
    <svg width={SPARK_W} height={SPARK_H} aria-hidden style={{ flexShrink: 0 }}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.2} opacity={0.8} />
    </svg>
  )
}

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
      <Sparkline points={points} />
    </Group>
  )
}
