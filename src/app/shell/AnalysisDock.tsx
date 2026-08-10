import { Stack, Text } from '@mantine/core'

/**
 * Analysis dock (right). Placeholder until features contribute panels
 * via the registry (S3) and the probe exists (S7).
 */
export function AnalysisDock() {
  return (
    <Stack p="sm" gap="xs">
      <Text size="xs" tt="uppercase" c="dimmed" fw={600} lts={1}>
        Analysis
      </Text>
      <Text size="xs" c="dimmed">
        Click the globe to probe a location.
      </Text>
    </Stack>
  )
}
