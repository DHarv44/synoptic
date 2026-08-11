import { ActionIcon, Chip, Group, Paper, SegmentedControl, Stack, Text } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { mapChromeStyle } from '@/ui/mapChrome'
import { useRadar } from '@/features/radar/level2/store'

interface Level2ControlProps {
  onSelect: (elevNum: number, moment: string, raw?: boolean) => void
  onSrv: (on: boolean) => void
  onRaw: (on: boolean) => void
  /** "245°/18 kt" style storm-motion annotation, when known. */
  stormMotion: string | null
}

/**
 * Floating radar bench: only the controls that change what's on the map —
 * site, tilt, moment, SRV/RAW — plus a one-line probe readout. The tables
 * (All-Tilts, full gate values) live in the Radar panel; the 3D and
 * cross-section views live in the left workbench.
 */
export function Level2Control({ onSelect, onSrv, onRaw, stormMotion }: Level2ControlProps) {
  const isMobile = useMediaQuery('(max-width: 48em)') ?? false
  const site = useRadar((s) => s.site)
  const tilts = useRadar((s) => s.tilts)
  const elevNum = useRadar((s) => s.elevNum)
  const moment = useRadar((s) => s.moment)
  const raw = useRadar((s) => s.raw)
  const srv = useRadar((s) => s.srv)
  const probe = useRadar((s) => s.probe)

  if (!site) return null

  const available = tilts.filter((t) => t.moments.includes(moment))
  const idx = available.findIndex((t) => t.num === elevNum)
  const current = available[idx] ?? available[0]

  return (
    <Paper
      withBorder
      p={6}
      radius="sm"
      style={{
        ...mapChromeStyle,
        position: 'absolute',
        zIndex: 5,
        ...(isMobile
          ? { top: 8, left: 60, maxWidth: 'calc(100% - 130px)' }
          : { bottom: 56, left: 52, minWidth: 210 }),
      }}
    >
      <Stack gap={4}>
        <Group justify="space-between" wrap="nowrap">
          <Text size="xs" fw={600} ff="monospace">
            {site.id}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {site.name}
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
          <Text size="xs" ff="monospace" w={46} ta="center">
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
                {stormMotion}
              </Text>
            )}
          </Group>
        )}
        {probe && (
          <Text size="xs" ff="monospace" c="dimmed">
            {Math.round(probe.azDeg)}° / {(probe.rangeM / 1000).toFixed(0)} km
            {probe.values.REF !== undefined && ` · ${probe.values.REF.toFixed(1)} dBZ`}
          </Text>
        )}
      </Stack>
    </Paper>
  )
}
