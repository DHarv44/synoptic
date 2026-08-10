import { Group, Text } from '@mantine/core'

/** Small color-swatch + label for chart legends. */
export function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <Group gap={4} wrap="nowrap">
      <div style={{ width: 10, height: 2, background: color }} />
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Group>
  )
}
