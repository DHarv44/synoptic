import { Group, Paper, Stack, Text } from '@mantine/core'
import { useFeatureOption } from '@/core/settings/store'
import { RADII_COLORS } from '@/features/tropical/radii'
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
  const showRadii = useFeatureOption<boolean>('tropical', 'windRadii')
  if (storms.length === 0) return null
  return (
    <Paper withBorder radius="sm" px={8} py={4} style={{ ...mapChromeStyle, pointerEvents: 'auto' }}>
      <Stack gap={3}>
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
        {showRadii && (
          <Group gap={6} wrap="nowrap">
            <Text size="xs" c="dimmed" lh={1.2}>
              Winds
            </Text>
            {([34, 50, 64] as const).map((kt) => (
              <Group key={kt} gap={3} wrap="nowrap">
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 2,
                    background: RADII_COLORS[kt],
                    opacity: 0.8,
                  }}
                />
                <Text size="xs" lh={1} style={{ fontSize: 10 }}>
                  {kt} kt
                </Text>
              </Group>
            ))}
            <Text size="xs" c="dimmed" lh={1} style={{ fontSize: 10 }}>
              at the clock's hour
            </Text>
          </Group>
        )}
      </Stack>
    </Paper>
  )
}
