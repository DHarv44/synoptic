import { ActionIcon, Chip, Group, Paper, SegmentedControl, Stack, Text } from '@mantine/core'
import type { TiltInfo } from '@/features/radar/level2/worker'

export interface ProbeReadout {
  azDeg: number
  rangeM: number
  beamKft: number
  values: Record<string, number>
}

interface Level2ControlProps {
  siteId: string
  siteName: string
  tilts: TiltInfo[]
  elevNum: number
  moment: string
  onSelect: (elevNum: number, moment: string) => void
  probe: ProbeReadout | null
  srv: boolean
  raw: boolean
  onSrv: (on: boolean) => void
  onRaw: (on: boolean) => void
  /** "245°/18 kt" style storm-motion annotation, when known */
  stormMotion: string | null
}

function fmtValue(moment: string, v: number): string {
  if (moment === 'REF') return `${v.toFixed(1)} dBZ`
  if (moment === 'VEL') return `${v.toFixed(1)} m/s`
  if (moment === 'ZDR') return `${v.toFixed(2)} dB`
  if (moment === 'RHO') return v.toFixed(3)
  return v.toFixed(1)
}

/** Floating single-site radar control: tilt, moment, gate probe readout. */
export function Level2Control({
  siteId,
  siteName,
  tilts,
  elevNum,
  moment,
  onSelect,
  probe,
  srv,
  raw,
  onSrv,
  onRaw,
  stormMotion,
}: Level2ControlProps) {
  const available = tilts.filter((t) => t.moments.includes(moment))
  const idx = available.findIndex((t) => t.num === elevNum)
  const current = available[idx] ?? available[0]

  return (
    <Paper
      withBorder
      p={6}
      radius="sm"
      style={{ position: 'absolute', bottom: 28, left: 8, zIndex: 5, minWidth: 190 }}
    >
      <Stack gap={4}>
        <Group justify="space-between" wrap="nowrap">
          <Text size="xs" fw={600} ff="monospace">
            {siteId}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {siteName}
          </Text>
        </Group>
        <Group gap={6} wrap="nowrap">
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            disabled={idx <= 0}
            onClick={() => onSelect(available[idx - 1].num, moment)}
            aria-label="Lower tilt"
          >
            ▼
          </ActionIcon>
          <Text size="xs" ff="monospace" w={54} ta="center">
            {current ? `${current.deg.toFixed(1)}°` : '—'}
          </Text>
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            disabled={idx < 0 || idx >= available.length - 1}
            onClick={() => onSelect(available[idx + 1].num, moment)}
            aria-label="Raise tilt"
          >
            ▲
          </ActionIcon>
          <SegmentedControl
            size="xs"
            value={moment}
            onChange={(m) => onSelect(elevNum, m)}
            data={['REF', 'VEL']}
          />
        </Group>
        {moment === 'VEL' && (
          <Group gap={6} wrap="nowrap">
            <Chip size="xs" checked={srv} onChange={() => onSrv(!srv)} disabled={stormMotion === null}>
              SRV
            </Chip>
            <Chip size="xs" checked={raw} onChange={() => onRaw(!raw)} color="orange">
              RAW
            </Chip>
            {stormMotion && (
              <Text size="xs" c="dimmed" ff="monospace">
                storm {stormMotion}
              </Text>
            )}
          </Group>
        )}
        {probe && (
          <Text size="xs" ff="monospace" c="dimmed">
            {Math.round(probe.azDeg)}° / {(probe.rangeM / 1000).toFixed(0)} km · beam{' '}
            {probe.beamKft.toFixed(1)} kft
            {Object.entries(probe.values).map(([k, v]) => (
              <span key={k}>
                {' · '}
                {k} {fmtValue(k, v)}
              </span>
            ))}
          </Text>
        )}
      </Stack>
    </Paper>
  )
}
