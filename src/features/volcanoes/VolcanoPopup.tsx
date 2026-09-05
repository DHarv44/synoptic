import { Badge, Group, Stack, Text } from '@mantine/core'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import { STATUS_COLORS, type VolcanoStatus } from '@/features/volcanoes/service'
import { useAdvisories } from '@/features/volcanoes/store'
import type { MapPopupProps } from '@/map/popups/registry'

const STATUS_TEXT: Record<string, string> = {
  erupting: 'ERUPTING',
  watch: 'WATCH',
  advisory: 'ADVISORY',
  quiet: 'quiet',
}

/** Click a triangle: what this mountain is, and what it's doing right now. */
export function VolcanoPopup({ properties }: MapPopupProps) {
  const fmt = useTimeFormat()
  const status = String(properties.status ?? 'quiet') as VolcanoStatus
  const number = typeof properties.number === 'number' ? properties.number : null
  const advisory = useAdvisories().find((a) => a.volcanoNumber === number)
  const lastYear = properties.lastEruptionYear

  return (
    <Stack gap={4}>
      <Group gap={6} wrap="nowrap">
        <Text size="sm" fw={600}>
          {String(properties.name ?? 'Volcano')}
        </Text>
        <Badge
          size="xs"
          variant={status === 'quiet' ? 'outline' : 'filled'}
          color="gray"
          styles={
            status === 'quiet' ? undefined : { root: { background: STATUS_COLORS[status] } }
          }
        >
          {STATUS_TEXT[status]}
        </Badge>
      </Group>
      <Text size="xs" c="dimmed">
        {String(properties.country ?? '')} · {String(properties.vtype ?? '')}
        {typeof properties.elevation === 'number' && ` · ${properties.elevation} m`}
        {typeof lastYear === 'number' && ` · last erupted ${lastYear < 0 ? `${-lastYear} BCE` : lastYear}`}
      </Text>
      {advisory && (
        <>
          <Text size="xs">
            {advisory.eruptionDetails || 'Ash advisory in effect.'}
          </Text>
          <Text size="xs" c="dimmed">
            VAAC {advisory.vaac}
            {advisory.issuedMs !== null && ` · issued ${fmt.hm(advisory.issuedMs)}`}
          </Text>
        </>
      )}
      {!advisory && properties.synopsis !== '' && (
        <Text size="xs" lineClamp={3}>
          {String(properties.synopsis)}
        </Text>
      )}
    </Stack>
  )
}
