import { Group, Stack, Table, Text } from '@mantine/core'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import type { MapPopupProps } from '@/map/popups/registry'

/** Flood categories worded the way NWS words them. */
const CATEGORY_TEXT: Record<string, string> = {
  no_flooding: 'no flooding',
  action: 'action stage',
  minor: 'minor flooding',
  moderate: 'moderate flooding',
  major: 'MAJOR flooding',
}

/** One river gauge: stage, flow, flood status, honestly aged. */
export function GaugePopup({ properties }: MapPopupProps) {
  const fmt = useTimeFormat()
  const validMs = Date.parse(String(properties.validTime ?? ''))
  const category = String(properties.category ?? '')
  const rows: Array<[string, string]> = [
    ['Stage', `${String(properties.stage ?? '')} — ${CATEGORY_TEXT[category] ?? category}`],
  ]
  if (properties.flow !== '') rows.push(['Flow', String(properties.flow)])

  return (
    <Stack gap={4}>
      <Group gap={6} wrap="nowrap">
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: String(properties.color ?? ''),
            flexShrink: 0,
          }}
        />
        <Text size="sm" fw={600} lineClamp={1}>
          {String(properties.name ?? properties.lid ?? 'Gauge')}
        </Text>
      </Group>
      <Text size="xs" c="dimmed">
        {String(properties.lid ?? '')}
        {Number.isFinite(validMs) && ` · obs ${fmt.hm(validMs)}`}
      </Text>
      <Table withRowBorders={false} verticalSpacing={1} fz="xs" data={{ body: rows }} />
    </Stack>
  )
}
