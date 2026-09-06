import { Badge, Group, Stack, Text } from '@mantine/core'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import { useUnits } from '@/core/units/useUnitSystem'
import { fmtPressure, fmtWind } from '@/core/units/format'
import type { MapPopupProps } from '@/map/popups/registry'

const KT_TO_MS = 0.514444

/** A storm's current position or one of its forecast points. */
export function StormPopup({ properties }: MapPopupProps) {
  const fmt = useTimeFormat()
  const u = useUnits()
  const kind = String(properties.kind ?? 'forecast')
  const maxwind = typeof properties.maxwind === 'number' ? properties.maxwind : null
  const gust = typeof properties.gust === 'number' ? properties.gust : null
  const mslp = typeof properties.mslp === 'number' ? properties.mslp : null
  const validMs = typeof properties.validMs === 'number' ? properties.validMs : null
  const issuedMs = typeof properties.issuedMs === 'number' ? properties.issuedMs : null
  const tau = typeof properties.tau === 'number' ? properties.tau : null

  return (
    <Stack gap={4}>
      <Group gap={6} wrap="nowrap">
        <Text size="sm" fw={600}>
          {String(properties.name ?? 'Storm')}
        </Text>
        <Badge
          size="xs"
          variant="filled"
          color="gray"
          styles={{ root: { background: String(properties.color ?? '#888'), color: '#111' } }}
        >
          {String(properties.category ?? '')}
        </Badge>
      </Group>
      <Text size="xs" c="dimmed">
        {kind === 'current'
          ? `Advisory ${String(properties.advNum ?? '')}${issuedMs !== null ? ` · ${fmt.hm(issuedMs)}` : ''} · moving ${String(properties.motion ?? '')}`
          : `${tau !== null ? `+${tau} h` : ''}${validMs !== null ? ` · ${fmt.dateTime(validMs)}` : ''}${properties.label ? ` (${String(properties.label)})` : ''}`}
      </Text>
      <Text size="xs">
        {maxwind !== null && `Max wind ${fmtWind(maxwind * KT_TO_MS, u.wind)}`}
        {gust !== null && ` · gusts ${fmtWind(gust * KT_TO_MS, u.wind)}`}
        {mslp !== null && ` · ${fmtPressure(mslp, u.pressure)}`}
      </Text>
    </Stack>
  )
}

/** A wind-radii quadrant: which threshold, which forecast hour, how far. */
export function RadiiPopup({ properties }: MapPopupProps) {
  const fmt = useTimeFormat()
  const kt = Number(properties.radii)
  const tau = Number(properties.tau) || 0
  const validMs = typeof properties.validMs === 'number' ? properties.validMs : null
  const label = kt === 64 ? 'hurricane-force' : kt === 50 ? '50-kt' : 'tropical-storm-force'
  const q = (k: string): string => `${Number(properties[k]) || 0}`
  return (
    <Stack gap={4}>
      <Text size="sm" fw={600}>
        {String(properties.name ?? 'Storm')} · {kt} kt winds
      </Text>
      <Text size="xs" c="dimmed">
        Extent of {label} winds {tau === 0 ? 'now' : `+${tau} h`}
        {validMs !== null && ` · valid ${fmt.dateTime(validMs)}`}
      </Text>
      <Text size="xs" ff="monospace">
        NE {q('ne')} · SE {q('se')} · SW {q('sw')} · NW {q('nw')} nm
      </Text>
    </Stack>
  )
}

/** One model's track. */
export function ModelPopup({ properties }: MapPopupProps) {
  const run = String(properties.run ?? '')
  const runLabel = run.length === 10 ? `${run.slice(6, 8)}/${run.slice(8, 10)}Z run` : run
  return (
    <Stack gap={4}>
      <Group gap={6} wrap="nowrap">
        <span
          style={{
            width: 14,
            height: 0,
            borderTop: `2px solid ${String(properties.color ?? '#888')}`,
            flexShrink: 0,
          }}
        />
        <Text size="sm" fw={600}>
          {String(properties.label ?? properties.tech ?? 'Model')}
        </Text>
      </Group>
      <Text size="xs" c="dimmed">
        {String(properties.name ?? '')} · {runLabel} · to +{String(properties.hours ?? '')} h
      </Text>
      <Text size="xs" c="dimmed">
        One model's track. Spread between models is not a probability.
      </Text>
    </Stack>
  )
}

/** A coastal watch or warning segment. */
export function WatchWarnPopup({ properties }: MapPopupProps) {
  return (
    <Stack gap={4}>
      <Group gap={6} wrap="nowrap">
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 2,
            background: String(properties.color ?? '#888'),
            flexShrink: 0,
          }}
        />
        <Text size="sm" fw={600}>
          {String(properties.label ?? 'Watch/warning')}
        </Text>
      </Group>
      <Text size="xs" c="dimmed">
        {String(properties.name ?? '')} · advisory {String(properties.advNum ?? '')} · NHC
      </Text>
    </Stack>
  )
}

/** Clicking the cone itself explains what it is — and what it is not. */
export function ConePopup({ properties }: MapPopupProps) {
  return (
    <Stack gap={4}>
      <Text size="sm" fw={600}>
        Forecast cone · {String(properties.name ?? '')}
      </Text>
      <Text size="xs">
        The area the storm's <b>centre</b> is expected to track through about two-thirds of
        the time, sized from the last five years of forecast error. It says nothing about
        the storm's size: winds, surge and rain reach well outside it.
      </Text>
    </Stack>
  )
}
