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
