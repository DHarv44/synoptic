import { Anchor, Group, Text } from '@mantine/core'
import { CREDITS } from '@/app/help/credits'

/** Footer credit strip; replaces the map's floating attribution control. */
export function AttributionBar() {
  return (
    <Group h="100%" px="sm" gap={6} wrap="nowrap" style={{ overflow: 'hidden' }}>
      <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
        Data:
      </Text>
      {CREDITS.map((c, i) => (
        <Group key={c.label} gap={6} wrap="nowrap">
          {i > 0 && (
            <Text size="xs" c="dimmed" opacity={0.4}>
              ·
            </Text>
          )}
          <Anchor
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            size="xs"
            c="dimmed"
            underline="hover"
            style={{ whiteSpace: 'nowrap' }}
          >
            {c.label}
          </Anchor>
        </Group>
      ))}
      <Text size="xs" c="dimmed" ml="auto" style={{ flexShrink: 0 }}>
        Not a substitute for official warnings
      </Text>
    </Group>
  )
}
