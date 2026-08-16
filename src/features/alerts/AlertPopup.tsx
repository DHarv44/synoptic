import { Badge, Group, Stack, Text } from '@mantine/core'
import { alertColor } from '@/core/data/nws/alerts'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import type { MapPopupProps } from '@/map/popups/registry'

/** Click a warning polygon, read the warning — event, area, until when. */
export function AlertPopup({ properties }: MapPopupProps) {
  const fmt = useTimeFormat()
  const event = String(properties.event ?? 'Alert')
  const expires = Date.parse(String(properties.expires ?? ''))
  return (
    <Stack gap={4}>
      <Group gap={6} wrap="nowrap">
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 2,
            background: alertColor(event),
            flexShrink: 0,
          }}
        />
        <Text size="sm" fw={600}>
          {event}
        </Text>
        <Badge size="xs" variant="light" color="gray">
          {String(properties.severity ?? '')}
        </Badge>
      </Group>
      {Number.isFinite(expires) && (
        <Text size="xs" c="dimmed">
          Until {fmt.dateTime(expires)}
        </Text>
      )}
      {properties.headline !== '' && <Text size="xs">{String(properties.headline)}</Text>}
      <Text size="xs" c="dimmed" lineClamp={2}>
        {String(properties.areaDesc ?? '')}
      </Text>
    </Stack>
  )
}
