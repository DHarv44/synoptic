import { useMemo } from 'react'
import {
  ActionIcon,
  Chip,
  Group,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core'
import {
  IconChevronDown,
  IconChevronUp,
  IconCrosshair,
  IconLock,
  IconLockOpen,
} from '@tabler/icons-react'
import { useCameraStore } from '@/map/cameraStore'
import { useRadar } from '@/features/radar/level2/store'
import { SITES } from '@/features/radar/level2/sites'
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

/** Which radar, and whether the map is allowed to change it. */
function SitePicker() {
  const site = useRadar((s) => s.site)
  const locked = useRadar((s) => s.locked)

  const options = useMemo(
    () =>
      [...SITES]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((s) => ({ value: s.id, label: `${s.id} · ${s.name.replace(',', ', ')}` })),
    [],
  )

  return (
    <>
      <Label>Site</Label>
      <Group gap={6} wrap="nowrap">
        <Select
          flex={1}
          size="xs"
          searchable
          allowDeselect={false}
          data={options}
          value={site?.id ?? null}
          placeholder="Choose a radar"
          nothingFoundMessage="No matching site"
          comboboxProps={{ withinPortal: true }}
          onChange={(id) => {
            const next = SITES.find((s) => s.id === id)
            if (next) useRadar.getState().pickSite(next)
          }}
        />
        <Tooltip label="Center the map on this radar">
          <ActionIcon
            size="md"
            variant="default"
            disabled={!site}
            aria-label="Center map on radar"
            onClick={() => site && useCameraStore.getState().requestFlyTo(site.lat, site.lon)}
          >
            <IconCrosshair size={15} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={locked ? 'Unlock — follow the map again' : 'Lock to this radar'}>
          <ActionIcon
            size="md"
            variant={locked ? 'filled' : 'default'}
            aria-label={locked ? 'Unlock radar site' : 'Lock radar site'}
            aria-pressed={locked}
            onClick={() => useRadar.getState().setLocked(!locked)}
          >
            {locked ? <IconLock size={15} /> : <IconLockOpen size={15} />}
          </ActionIcon>
        </Tooltip>
      </Group>
      <Text size="xs" c="dimmed">
        {locked
          ? 'Locked. The map can roam without changing radar.'
          : 'Following the map — whichever radar is nearest the view.'}
      </Text>
    </>
  )
}

/** What the attached site is painting: which cut, which moment. */
function SweepControls() {
  const tilts = useRadar((s) => s.tilts)
  const elevNum = useRadar((s) => s.elevNum)
  const moment = useRadar((s) => s.moment)
  const raw = useRadar((s) => s.raw)
  const srv = useRadar((s) => s.srv)
  const storm = useRadar((s) => s.storm)

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
    <>
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
    </>
  )
}

/**
 * What the radar is currently showing, and the controls that change it.
 * These used to float over the map with no labels, which read as a mystery
 * box — here each control can say what it is, next to the numbers it drives.
 */
export function RadarControls() {
  const site = useRadar((s) => s.site)

  return (
    <Stack gap={6}>
      <SitePicker />
      {site && <SweepControls />}
    </Stack>
  )
}
