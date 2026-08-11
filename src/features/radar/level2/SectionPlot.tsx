import { Group, Paper, Stack, Text } from '@mantine/core'
import { dbzToCss } from '@/features/radar/level2/colormap'
import type { SectionTilt } from '@/features/radar/level2/worker'

const W = 300
const H = 130
const ML = 22
const MB = 14
const MAX_KFT = 50

const EFFECTIVE_EARTH_R = (4 / 3) * 6_371_000
const DEG = Math.PI / 180

function beamKft(rangeM: number, elevDeg: number): number {
  const h = rangeM * Math.sin(elevDeg * DEG) + (rangeM * rangeM) / (2 * EFFECTIVE_EARTH_R)
  return (h * 3.28084) / 1000
}

interface SectionPlotProps {
  tilts: SectionTilt[]
  sampleRangesM: number[]
  lengthKm: number
  onClose: () => void
}

/**
 * Vertical cross-section (RHI-style): each tilt's samples plotted at their
 * true beam height along the section line. Gaps between tilts are real —
 * the radar only samples where the beams go.
 */
export function SectionPlot({ tilts, sampleRangesM, lengthKm, onClose }: SectionPlotProps) {
  const n = sampleRangesM.length
  const cellW = (W - ML) / Math.max(n - 1, 1)

  return (
    <Paper
      withBorder
      p={6}
      radius="sm"
      style={{ position: 'absolute', bottom: 28, right: 8, zIndex: 5 }}
    >
      <Stack gap={2}>
        <Group justify="space-between" wrap="nowrap">
          <Text size="xs" fw={600}>
            Cross-section · {lengthKm.toFixed(0)} km
          </Text>
          <Text size="xs" c="dimmed" style={{ cursor: 'pointer' }} onClick={onClose}>
            ✕
          </Text>
        </Group>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} style={{ display: 'block' }}>
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
                <text x={ML - 3} y={y + 3} fontSize={7} fill="var(--mantine-color-dimmed)" textAnchor="end">
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
              const kft = beamKft(sampleRangesM[i], t.elevationDeg)
              if (kft > MAX_KFT) return null
              const y = H - MB - (kft / MAX_KFT) * (H - MB)
              return (
                <rect
                  key={`${t.elevationDeg}-${i}`}
                  x={ML + i * cellW}
                  y={y - 2}
                  width={Math.max(cellW, 1.5)}
                  height={4}
                  fill={color}
                />
              )
            }),
          )}
          <text x={ML} y={H - 3} fontSize={7} fill="var(--mantine-color-dimmed)">
            A
          </text>
          <text x={W - 6} y={H - 3} fontSize={7} fill="var(--mantine-color-dimmed)">
            B
          </text>
          <text x={2} y={10} fontSize={7} fill="var(--mantine-color-dimmed)">
            kft
          </text>
        </svg>
      </Stack>
    </Paper>
  )
}
