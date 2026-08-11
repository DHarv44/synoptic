import { ActionIcon, Group, Text, Tooltip, useMantineColorScheme } from '@mantine/core'
import { spotlight } from '@mantine/spotlight'
import { IconMoon, IconSearch, IconSun } from '@tabler/icons-react'
import { Clock } from '@/ui/Clock'
import { HealthStrip } from '@/app/shell/HealthStrip'

export function TopBar() {
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
            <IconSearch size={17} stroke={1.6} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Clock />

      <Group gap="xs" wrap="nowrap">
        <HealthStrip />
        <Tooltip label={colorScheme === 'dark' ? 'Light mode' : 'Dark mode'}>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={toggleColorScheme}
            aria-label="Toggle color scheme"
          >
            {colorScheme === 'dark' ? <IconSun size={17} stroke={1.6} /> : <IconMoon size={17} stroke={1.6} />}
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  )
}
