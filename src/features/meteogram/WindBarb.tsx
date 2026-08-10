import { MS_TO_KT, barbSpec } from '@/core/met/barbs'

const STAFF = 14
const SPACING = 3.2

interface WindBarbProps {
  x: number
  y: number
  dirDeg: number // meteorological: direction wind blows FROM
  speedMs: number
  color: string
}

/** Standard station-model wind barb (flags 50kt, full 10kt, half 5kt). */
export function WindBarb({ x, y, dirDeg, speedMs, color }: WindBarbProps) {
  const spec = barbSpec(speedMs * MS_TO_KT)
  if (spec.calm) {
    return <circle cx={x} cy={y} r={2} fill="none" stroke={color} strokeWidth={1} />
  }

  const elements: React.ReactNode[] = []
  let pos = -STAFF
  let key = 0
  for (let i = 0; i < spec.flags; i++) {
    elements.push(<path key={key++} d={`M0,${pos} L5,${pos + 2} L0,${pos + 4} Z`} fill={color} />)
    pos += SPACING + 2
  }
  for (let i = 0; i < spec.fulls; i++) {
    elements.push(<line key={key++} x1={0} y1={pos} x2={6} y2={pos - 3} />)
    pos += SPACING
  }
  for (let i = 0; i < spec.halves; i++) {
    elements.push(<line key={key++} x1={0} y1={pos} x2={3} y2={pos - 1.5} />)
    pos += SPACING
  }

  return (
    <g
      transform={`translate(${x},${y}) rotate(${dirDeg})`}
      stroke={color}
      strokeWidth={1}
      fill="none"
    >
      <line x1={0} y1={0} x2={0} y2={-STAFF} />
      {elements}
    </g>
  )
}
