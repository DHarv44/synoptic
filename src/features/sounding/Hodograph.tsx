import { useMemo } from 'react'
import type { Sounding } from '@/core/data/openMeteo/sounding'
import { bunkersRightMover, toUV } from '@/core/met/kinematics'

const SIZE = 180
const C = SIZE / 2
const MAX_MS = 45
const RINGS = [10, 20, 30, 40]

/** height (km AGL) → segment color, roughly the SPC convention. */
function colorForKm(km: number): string {
  if (km < 3) return 'var(--mantine-color-red-6)'
  if (km < 6) return 'var(--mantine-color-green-6)'
  if (km < 9) return 'var(--mantine-color-blue-5)'
  return 'var(--mantine-color-gray-6)'
}

function xy(u: number, v: number): [number, number] {
  return [C + (u / MAX_MS) * C, C - (v / MAX_MS) * C]
}

/** Hodograph with height-colored segments + Bunkers right-mover marker. */
export function Hodograph({ sounding }: { sounding: Sounding }) {
  const { segments, storm } = useMemo(() => {
    const z0 = sounding.levels[0].z
    const pts = sounding.levels
      .filter((l) => l.z - z0 < 12_000)
      .map((l) => {
        const { u, v } = toUV(l.ws, l.wd)
        return { p: xy(u, v), km: (l.z - z0) / 1000 }
      })
    const segments = pts.slice(0, -1).map((a, i) => ({
      x1: a.p[0],
      y1: a.p[1],
      x2: pts[i + 1].p[0],
      y2: pts[i + 1].p[1],
      color: colorForKm(a.km),
    }))
    const rm = bunkersRightMover(sounding.levels)
    return { segments, storm: xy(rm.u, rm.v) }
  }, [sounding])

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} style={{ display: 'block' }}>
      {RINGS.map((r) => (
        <circle
          key={r}
          cx={C}
          cy={C}
          r={(r / MAX_MS) * C}
          fill="none"
          stroke="var(--mantine-color-default-border)"
          strokeWidth={0.5}
        />
      ))}
      <line x1={0} x2={SIZE} y1={C} y2={C} stroke="var(--mantine-color-default-border)" strokeWidth={0.5} />
      <line x1={C} x2={C} y1={0} y2={SIZE} stroke="var(--mantine-color-default-border)" strokeWidth={0.5} />
      {segments.map((s, i) => (
        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.color} strokeWidth={1.8} />
      ))}
      {/* Bunkers right-mover */}
      <g stroke="var(--mantine-color-orange-6)" strokeWidth={1.4}>
        <line x1={storm[0] - 4} y1={storm[1] - 4} x2={storm[0] + 4} y2={storm[1] + 4} />
        <line x1={storm[0] - 4} y1={storm[1] + 4} x2={storm[0] + 4} y2={storm[1] - 4} />
      </g>
      <text x={4} y={10} fontSize={8} fill="var(--mantine-color-dimmed)">
        rings 10 m/s · ×RM
      </text>
    </svg>
  )
}
