import { Button, Menu, Stack, Text } from '@mantine/core'
import { IconCheck, IconStackFront } from '@tabler/icons-react'
import { BUILT_IN_PRESETS, getPreset } from '@/core/presets/presets'
import { usePresets } from '@/core/presets/store'

/** Scene preset switcher: one tap swaps the whole layer stack for a task. */
export function PresetMenu() {
  const activeId = usePresets((s) => s.activeId)
  const apply = usePresets((s) => s.apply)
  const active = activeId !== null ? getPreset(activeId) : undefined

  return (
    <Menu position="bottom-start" width={250} withinPortal>
      <Menu.Target>
        <Button
          variant="subtle"
          color="gray"
          size="compact-xs"
          leftSection={<IconStackFront size={15} stroke={1.6} />}
          aria-label="Scene presets"
        >
          {active?.label ?? 'Scene'}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Scene presets</Menu.Label>
        {BUILT_IN_PRESETS.map((p) => (
          <Menu.Item
            key={p.id}
            onClick={() => apply(p.id)}
            rightSection={p.id === activeId ? <IconCheck size={14} stroke={2} /> : undefined}
          >
            <Stack gap={0}>
              <Text size="sm">{p.label}</Text>
              <Text size="xs" c="dimmed">
                {p.description}
              </Text>
            </Stack>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  )
}
