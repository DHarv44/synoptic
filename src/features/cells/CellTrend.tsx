import { Group, Stack, Text } from '@mantine/core'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import { trendFor, type TrendPoint } from '@/features/cells/history'

const W = 260
const H = 60
const ML = 24

interface SeriesSpec {
  label: string
  color: string
  get: (p: TrendPoint) => number
}

const SERIES: SeriesSpec[] = [
  { label: 'dBZ', color: 'var(--mantine-color-red-6)', get: (p) => p.maxDbz },
  { label: 'VIL', color: 'var(--mantine-color-blue-5)', get: (p) => p.vil },
  { label: 'top kft', color: 'var(--mantine-color-teal-5)', get: (p) => p.top },
]

function path(points: TrendPoint[], spec: SeriesSpec, min: number, max: number): string {
  const span = Math.max(max - min, 1)
  return points
    .map((p, i) => {
      const x = ML + (i / Math.max(points.length - 1, 1)) * (W - ML - 4)
      const y = H - 12 - ((spec.get(p) - min) / span) * (H - 22)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join('')
}

/**
 * Trend for one cell over this session's observations. The attribute feed
 * has no history endpoint — the window starts when the app opened.
 */
export function CellTrend({ cellKey, title }: { cellKey: string; title: string }) {
  const points = trendFor(cellKey)
  const fmt = useTimeFormat()

  if (points.length < 2) {
    return (
      <Text size="xs" c="dimmed">
        {title}: trend builds as new volumes arrive (needs 2+ observations).
      </Text>
    )
  }

  const all = SERIES.flatMap((s) => points.map(s.get))
  const min = Math.min(...all)
  const max = Math.max(...all)

  return (
    <Stack gap={2}>
      <Text size="xs" fw={600}>
        {title} · {points.length} obs
      </Text>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        {[min, max].map((v, i) => {
          const y = i === 0 ? H - 12 : 10
          return (
            <g key={v}>
              <line x1={ML} x2={W - 4} y1={y} y2={y} stroke="var(--mantine-color-default-border)" strokeWidth={0.5} />
              <text x={ML - 3} y={y + 3} fontSize={7} fill="var(--mantine-color-dimmed)" textAnchor="end">
                {Math.round(v)}
              </text>
            </g>
          )
        })}
        {SERIES.map((s) => (
          <path key={s.label} d={path(points, s, min, max)} fill="none" stroke={s.color} strokeWidth={1.4} />
        ))}
      </svg>
      <Group gap="xs">
        {SERIES.map((s) => (
          <Group key={s.label} gap={3} wrap="nowrap">
            <div style={{ width: 8, height: 2, background: s.color }} />
            <Text size="xs" c="dimmed">
              {s.label}
            </Text>
          </Group>
        ))}
        <Text size="xs" c="dimmed" ff="monospace">
          {fmt.time(points[0].t)}→{fmt.time(points[points.length - 1].t)}
        </Text>
      </Group>
    </Stack>
  )
}
