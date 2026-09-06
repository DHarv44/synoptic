import { Paper, Text } from '@mantine/core'
import { gfsRunLabel, useGfsRun } from '@/core/data/gfsRun'
import { useFeatureOption } from '@/core/settings/store'
import { FIELD_SPECS } from '@/features/fields/service'
import { mapChromeStyle } from '@/ui/mapChrome'

/**
 * The product label a chart carries in its corner: what field, what
 * interval, which run and forecast hour. Without the run and hour a set of
 * isobars is a picture; with them it is a product someone can act on.
 */
export function FieldsLegend() {
  const field = useFeatureOption<string>('fields', 'field')
  const mslpInterval = useFeatureOption<string>('fields', 'mslpInterval')
  const info = useGfsRun((s) => s.byProduct['fields'])
  const spec = FIELD_SPECS[field] ?? FIELD_SPECS.mslp
  const interval = field === 'mslp' ? Number(mslpInterval) || spec.interval : spec.interval
  return (
    <Paper withBorder radius="sm" px={8} py={4} style={{ ...mapChromeStyle, pointerEvents: 'auto' }}>
      <Text size="xs" c="dimmed" lh={1.2}>
        {spec.label} · {interval} {spec.unitLabel} · {gfsRunLabel(info)}
      </Text>
    </Paper>
  )
}
