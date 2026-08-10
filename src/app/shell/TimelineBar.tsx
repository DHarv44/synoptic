import { Group, Text } from '@mantine/core'

/**
 * Global timeline (bottom). Placeholder until the timeline store lands (S4).
 */
export function TimelineBar() {
  return (
    <Group h="100%" px="md" gap="md" wrap="nowrap">
      <Text size="xs" ff="monospace" c="dimmed">
        TIMELINE
      </Text>
      <Text size="xs" c="dimmed">
        −48h ─────────── now ─────────── +16d (S4)
      </Text>
    </Group>
  )
}
