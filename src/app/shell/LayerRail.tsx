import { Stack, Text } from '@mantine/core'

/**
 * Layer stack (left rail). Placeholder until the feature registry (S3)
 * contributes real layer entries.
 */
export function LayerRail() {
  return (
    <Stack p="sm" gap="xs">
      <Text size="xs" tt="uppercase" c="dimmed" fw={600} lts={1}>
        Layers
      </Text>
      <Text size="xs" c="dimmed">
        No layers registered yet.
      </Text>
    </Stack>
  )
}
