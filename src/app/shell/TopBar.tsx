import { ActionIcon, Group, Text, Tooltip, useMantineColorScheme } from '@mantine/core'
import { spotlight } from '@mantine/spotlight'
import { UtcClock } from '@/ui/UtcClock'
import { HealthStrip } from '@/app/shell/HealthStrip'

interface TopBarProps {
  onToggleDock: () => void
  onOpenSettings: () => void
}

export function TopBar({ onToggleDock, onOpenSettings }: TopBarProps) {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()

  return (
    <Group h="100%" px="sm" justify="space-between" wrap="nowrap">
      <Group gap="xs" wrap="nowrap">
        <Text fw={700} size="sm" ff="monospace" tt="uppercase" lts={2}>
          Synoptic
        </Text>
        <Tooltip label="Search locations (Ctrl+K)">
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => spotlight.open()}
            aria-label="Search locations"
          >
            🔍
          </ActionIcon>
        </Tooltip>
      </Group>

      <UtcClock />

      <Group gap="xs" wrap="nowrap">
        <HealthStrip />
        <Tooltip label={colorScheme === 'dark' ? 'Light mode' : 'Dark mode'}>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={toggleColorScheme}
            aria-label="Toggle color scheme"
          >
            {colorScheme === 'dark' ? '☀' : '☾'}
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Settings">
          <ActionIcon variant="subtle" color="gray" onClick={onOpenSettings} aria-label="Open settings">
            ⚙
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Analysis dock">
          <ActionIcon variant="subtle" color="gray" onClick={onToggleDock} aria-label="Toggle analysis dock">
            ▤
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  )
}
