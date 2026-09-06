import { Group, Paper, Text } from '@mantine/core'
import { CATEGORY_COLORS, type CategoryKey } from '@/features/tropical/service'
import { useTropical } from '@/features/tropical/store'
import { mapChromeStyle } from '@/ui/mapChrome'

const ORDER: Array<[CategoryKey, string]> = [
  ['TD', 'TD'],
  ['TS', 'TS'],
  ['C1', '1'],
  ['C2', '2'],
  ['C3', '3'],
  ['C4', '4'],
  ['C5', '5'],
]

/** The Saffir-Simpson key, shown only while a storm is on the map. */
export function TropicalLegend() {
  const storms = useTropical()?.storms ?? []
  if (storms.length === 0) return null
  return (
    <Paper withBorder radius="sm" px={8} py={4} style={{ ...mapChromeStyle, pointerEvents: 'auto' }}>
      <Group gap={6} wrap="nowrap">
        <Text size="xs" c="dimmed" lh={1.2}>
          Cyclone
        </Text>
        {ORDER.map(([key, label]) => (
          <Group key={key} gap={3} wrap="nowrap">
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 5,
                background: CATEGORY_COLORS[key],
                border: '1px solid rgba(0,0,0,0.5)',
              }}
            />
            <Text size="xs" lh={1} style={{ fontSize: 10 }}>
              {label}
            </Text>
          </Group>
        ))}
      </Group>
    </Paper>
  )
}
