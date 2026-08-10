const MS_TO_KT = 1.94384
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
  const kt = speedMs * MS_TO_KT
  if (kt < 2.5) {
    return <circle cx={x} cy={y} r={2} fill="none" stroke={color} strokeWidth={1} />
  }

  let remaining = Math.round(kt / 5) * 5
  const elements: React.ReactNode[] = []
  let pos = -STAFF
  let key = 0
  while (remaining >= 50) {
    elements.push(<path key={key++} d={`M0,${pos} L5,${pos + 2} L0,${pos + 4} Z`} fill={color} />)
    pos += SPACING + 2
    remaining -= 50
  }
  while (remaining >= 10) {
    elements.push(<line key={key++} x1={0} y1={pos} x2={6} y2={pos - 3} />)
    pos += SPACING
    remaining -= 10
  }
  while (remaining >= 5) {
    elements.push(<line key={key++} x1={0} y1={pos} x2={3} y2={pos - 1.5} />)
    pos += SPACING
    remaining -= 5
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
