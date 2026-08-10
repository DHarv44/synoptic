import { Center, Text } from '@mantine/core'

/**
 * Center viewport. Hosts the R3F globe scene from S6 onward.
 */
export function Viewport() {
  return (
    <Center flex={1} style={{ minWidth: 0 }}>
      <Text ff="monospace" c="dimmed" size="sm">
        [ globe scene — S6 ]
      </Text>
    </Center>
  )
}
