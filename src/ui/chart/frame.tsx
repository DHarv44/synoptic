/** Shared d3-chart furniture: y gridlines, UTC day ticks, now cursor. */

const GRID = 'var(--mantine-color-default-border)'
const TEXT = 'var(--mantine-color-dimmed)'
const NOW = 'var(--mantine-color-orange-6)'

interface YGridProps {
  ticks: Array<{ v: number; y: number }>
  x1: number
  x2: number
  label?: (v: number) => string
}

export function YGrid({ ticks, x1, x2, label }: YGridProps) {
  return (
    <>
      {ticks.map(({ v, y }) => (
        <g key={v}>
          <line x1={x1} x2={x2} y1={y} y2={y} stroke={GRID} strokeWidth={0.5} />
          <text x={x1 - 4} y={y + 3} fontSize={8} fill={TEXT} textAnchor="end">
            {label ? label(v) : v}
          </text>
        </g>
      ))}
    </>
  )
}

interface DayTicksProps {
  ticks: Array<{ t: number; x: number }>
  y1: number
  y2: number
  labelY: number
}

export function DayTicks({ ticks, y1, y2, labelY }: DayTicksProps) {
  return (
    <>
      {ticks.map(({ t, x }) => (
        <g key={t}>
          <line x1={x} x2={x} y1={y1} y2={y2} stroke={GRID} strokeWidth={0.5} />
          <text x={x + 2} y={labelY} fontSize={7.5} fill={TEXT}>
            {new Date(t).toISOString().slice(5, 10)}
          </text>
        </g>
      ))}
    </>
  )
}

interface NowCursorProps {
  x: number
  xMin: number
  xMax: number
  y1: number
  y2: number
}

export function NowCursor({ x, xMin, xMax, y1, y2 }: NowCursorProps) {
  if (x < xMin || x > xMax) return null
  return <line x1={x} x2={x} y1={y1} y2={y2} stroke={NOW} strokeWidth={1} />
}
