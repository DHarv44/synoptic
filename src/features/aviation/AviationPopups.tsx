import { Badge, Group, Stack, Text } from '@mantine/core'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import type { MapPopupProps } from '@/map/popups/registry'

/** A pilot report, in the pilot's words. */
export function PirepPopup({ properties }: MapPopupProps) {
  const fmt = useTimeFormat()
  const obsTime = typeof properties.obsTime === 'number' ? properties.obsTime : null
  const urgent = String(properties.pirepType ?? '') === 'Urgent PIREP'
  return (
    <Stack gap={4}>
      <Group gap={6} wrap="nowrap">
        <Text size="sm" fw={600}>
          PIREP
        </Text>
        {urgent && (
          <Badge size="xs" color="red">
            URGENT
          </Badge>
        )}
        <Text size="xs" c="dimmed">
          {String(properties.acType ?? '')} FL{String(properties.fltLvl ?? '')}
        </Text>
      </Group>
      {obsTime !== null && (
        <Text size="xs" c="dimmed">
          {fmt.hm(obsTime * 1000)}
        </Text>
      )}
      <Text size="xs" ff="monospace" style={{ wordBreak: 'break-word' }}>
        {String(properties.rawOb ?? '')}
      </Text>
    </Stack>
  )
}

/** The SIGMET behind the wash, raw text included. */
export function SigmetPopup({ properties }: MapPopupProps) {
  const fmt = useTimeFormat()
  const to = typeof properties.validTimeTo === 'number' ? properties.validTimeTo : null
  return (
    <Stack gap={4}>
      <Group gap={6} wrap="nowrap">
        <Text size="sm" fw={600} c={String(properties.color ?? '')}>
          SIGMET · {String(properties.hazard ?? '')}
        </Text>
      </Group>
      {to !== null && (
        <Text size="xs" c="dimmed">
          Until {fmt.hm(to * 1000)}
        </Text>
      )}
      <Text size="xs" ff="monospace" lineClamp={8} style={{ wordBreak: 'break-word' }}>
        {String(properties.rawAirSigmet ?? '')}
      </Text>
    </Stack>
  )
}
