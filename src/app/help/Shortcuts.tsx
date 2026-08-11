import { Kbd, Stack, Table, Text } from '@mantine/core'

/** Every binding the app actually registers. Keep in step with the code. */
const KEYS: Array<{ keys: string[]; what: string }> = [
  { keys: ['Ctrl', 'K'], what: 'Search for a location' },
  { keys: ['Space'], what: 'Play / pause the timeline' },
  { keys: ['←', '→'], what: 'Step the timeline by 10 minutes' },
  { keys: ['↑', '↓'], what: 'Step the radar elevation cut, while a Level 2 site is attached' },
  { keys: ['Esc'], what: 'Cancel drawing a cross-section' },
]

export function Shortcuts() {
  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Tilt stepping works without opening a panel, so you can walk a storm while
        watching the map.
      </Text>
      <Table withRowBorders={false} verticalSpacing="xs" fz="sm">
        <Table.Tbody>
          {KEYS.map((k) => (
            <Table.Tr key={k.what}>
              <Table.Td w={110} style={{ whiteSpace: 'nowrap' }}>
                {k.keys.map((key, i) => (
                  <span key={key}>
                    {i > 0 && <Text component="span" c="dimmed" size="xs">{' + '}</Text>}
                    <Kbd size="xs">{key}</Kbd>
                  </span>
                ))}
              </Table.Td>
              <Table.Td c="dimmed">{k.what}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  )
}
