import { ActionIcon, Chip, Group, SegmentedControl, Stack, Text, Tooltip } from '@mantine/core'
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { useRadar } from '@/features/radar/level2/store'
import { setMoment, setRaw, setSrv, stepTilt, tiltsFor } from '@/features/radar/level2/controls'

const DEG = Math.PI / 180

/** Section label, matching the readout tables below. */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={0.8}>
      {children}
    </Text>
  )
}

const MOMENT_HINT: Record<string, string> = {
  REF: 'Echo strength. Heavier precipitation reads higher.',
  VEL: 'Air motion toward or away from the radar.',
}

/**
 * What the radar is currently showing, and the controls that change it.
 * These used to float over the map with no labels, which read as a mystery
 * box — here each control can say what it is, next to the numbers it drives.
 */
export function RadarControls() {
  const site = useRadar((s) => s.site)
  const tilts = useRadar((s) => s.tilts)
  const elevNum = useRadar((s) => s.elevNum)
  const moment = useRadar((s) => s.moment)
  const raw = useRadar((s) => s.raw)
  const srv = useRadar((s) => s.srv)
  const storm = useRadar((s) => s.storm)

  if (!site) return null

  const available = tiltsFor(tilts, moment)
  const idx = available.findIndex((t) => t.num === elevNum)
  const current = available[idx] ?? available[0]
  const stormMotion =
    storm === null
      ? null
      : `${Math.round((Math.atan2(-storm.u, -storm.v) / DEG + 360) % 360)}° / ${Math.round(
          Math.hypot(storm.u, storm.v) * 1.94384,
        )} kt`

  return (
    <Stack gap={6}>
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Text size="sm" fw={600} ff="monospace">
          {site.id}
        </Text>
        <Text size="xs" c="dimmed" truncate>
          {site.name}
        </Text>
      </Group>

      <Label>Elevation</Label>
      <Group gap={6} wrap="nowrap">
        <ActionIcon
          size="sm"
          variant="default"
          disabled={idx <= 0}
          onClick={() => stepTilt(-1)}
          aria-label="Lower tilt"
        >
          <IconChevronDown size={14} />
        </ActionIcon>
        <Text size="sm" ff="monospace" w={46} ta="center">
          {current ? `${current.deg.toFixed(1)}°` : '—'}
        </Text>
        <ActionIcon
          size="sm"
          variant="default"
          disabled={idx < 0 || idx >= available.length - 1}
          onClick={() => stepTilt(1)}
          aria-label="Raise tilt"
        >
          <IconChevronUp size={14} />
        </ActionIcon>
        <Text size="xs" c="dimmed">
          {available.length > 0 ? `cut ${Math.max(idx, 0) + 1} of ${available.length}` : 'no cuts'}
          {' · '}↑↓ keys
        </Text>
      </Group>

      <Label>Product</Label>
      <SegmentedControl
        size="xs"
        fullWidth
        value={moment}
        onChange={setMoment}
        data={[
          { value: 'REF', label: 'Reflectivity' },
          { value: 'VEL', label: 'Velocity' },
        ]}
      />
      <Text size="xs" c="dimmed">
        {MOMENT_HINT[moment]}
      </Text>

      {moment === 'VEL' && (
        <Group gap={6} wrap="nowrap">
          <Tooltip
            label={
              stormMotion === null
                ? 'Needs storm motion — waiting on the model sounding'
                : 'Subtracts the storm’s own motion so rotation stands out'
            }
          >
            <Chip
              size="xs"
              checked={srv}
              onChange={() => setSrv(!srv)}
              disabled={stormMotion === null}
            >
              Storm-relative
            </Chip>
          </Tooltip>
          <Tooltip label="Show folded velocities as received, without dealiasing">
            <Chip size="xs" checked={raw} onChange={() => setRaw(!raw)} color="orange">
              Raw
            </Chip>
          </Tooltip>
          {stormMotion && (
            <Text size="xs" c="dimmed" ff="monospace">
              {stormMotion}
            </Text>
          )}
        </Group>
      )}
    </Stack>
  )
}
