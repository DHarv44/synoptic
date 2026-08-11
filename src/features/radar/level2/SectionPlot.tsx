import { Group, Stack, Text } from '@mantine/core'
import { dbzToCss } from '@/features/radar/level2/colormap'
import { useRadar } from '@/features/radar/level2/store'

const W = 600
const H = 260
const ML = 30
const MB = 18
const MAX_KFT = 50

const EFFECTIVE_EARTH_R = (4 / 3) * 6_371_000
const DEG = Math.PI / 180

function beamKft(rangeM: number, elevDeg: number): number {
  const h = rangeM * Math.sin(elevDeg * DEG) + (rangeM * rangeM) / (2 * EFFECTIVE_EARTH_R)
  return (h * 3.28084) / 1000
}

/**
 * Vertical cross-section (RHI-style): each tilt's samples plotted at their
 * true beam height along the section line. Gaps between tilts are real —
 * the radar only samples where the beams go.
 */
export function SectionPlot() {
  const section = useRadar((s) => s.section)

  if (!section) {
    return (
      <Stack gap={4} p="sm">
        <Text size="sm" fw={600}>
          Cross-section
        </Text>
        <Text size="xs" c="dimmed">
          Shift-click two points on the map to slice through a storm. The panel
          plots reflectivity at each tilt's true beam height along that line.
        </Text>
      </Stack>
    )
  }

  const { tilts, ranges, lengthKm } = section
  const cellW = (W - ML) / Math.max(ranges.length - 1, 1)

  return (
    <Stack gap={4} p="xs" h="100%" style={{ minHeight: 0 }}>
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm" fw={600}>
          Cross-section
        </Text>
        <Text size="xs" c="dimmed" ff="monospace">
          {lengthKm.toFixed(0)} km
        </Text>
      </Group>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', flex: 1, minHeight: 0 }}
      >
        {[0, 10, 20, 30, 40, 50].map((kft) => {
          const y = H - MB - (kft / MAX_KFT) * (H - MB)
          return (
            <g key={kft}>
              <line
                x1={ML}
                x2={W}
                y1={y}
                y2={y}
                stroke="var(--mantine-color-default-border)"
                strokeWidth={0.5}
              />
              <text x={ML - 4} y={y + 3} fontSize={9} fill="var(--mantine-color-dimmed)" textAnchor="end">
                {kft}
              </text>
            </g>
          )
        })}
        {tilts.map((t) =>
          t.values.map((v, i) => {
            if (v === null) return null
            const color = dbzToCss(v)
            if (color === null) return null
            const kft = beamKft(ranges[i], t.elevationDeg)
            if (kft > MAX_KFT) return null
            const y = H - MB - (kft / MAX_KFT) * (H - MB)
            return (
              <rect
                key={`${t.elevationDeg}-${i}`}
                x={ML + i * cellW}
                y={y - 2.5}
                width={Math.max(cellW, 2)}
                height={5}
                fill={color}
              />
            )
          }),
        )}
        <text x={ML} y={H - 4} fontSize={9} fill="var(--mantine-color-dimmed)">
          A
        </text>
        <text x={W - 8} y={H - 4} fontSize={9} fill="var(--mantine-color-dimmed)">
          B
        </text>
        <text x={2} y={12} fontSize={9} fill="var(--mantine-color-dimmed)">
          kft
        </text>
      </svg>
    </Stack>
  )
}
