import { ActionIcon, Group, Stack, Text, Tooltip } from '@mantine/core'
import { IconX } from '@tabler/icons-react'
import { useTools } from '@/app/shell/toolStore'
import { useAvailableTools } from '@/app/shell/ToolRail'
import { mapChromeStyle } from '@/ui/mapChrome'

/**
 * Mobile tools: buttons across the top of the map; opening one takes the
 * screen (a phone has no room to host a workbench beside the map).
 */
export function MobileToolBar() {
  const tools = useAvailableTools()
  const active = useTools((s) => s.active)
  const toggle = useTools((s) => s.toggle)
  const close = useTools((s) => s.close)

  if (tools.length === 0) return null
  const tool = tools.find((t) => t.id === active)

  if (tool) {
    const Tool = tool.component
    return (
      <Stack
        gap={0}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 8,
          background: 'var(--mantine-color-body)',
        }}
      >
        <Group justify="space-between" wrap="nowrap" px="xs" py={6} style={{ flexShrink: 0 }}>
          <Text size="sm" fw={600}>
            {tool.title}
          </Text>
          <ActionIcon variant="subtle" color="gray" aria-label="Close tool" onClick={close}>
            <IconX size={17} stroke={1.7} />
          </ActionIcon>
        </Group>
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <Tool />
        </div>
      </Stack>
    )
  }

  return (
    <Group gap={6} style={{ position: 'absolute', top: 8, left: 8, zIndex: 6 }}>
      {tools.map((t) => {
        const Icon = t.icon
        return (
          <Tooltip key={t.id} label={t.title} position="bottom">
            <ActionIcon
              size={40}
              radius="xl"
              variant="default"
              aria-label={t.title}
              onClick={() => toggle(t.id)}
              style={{ ...mapChromeStyle, borderRadius: 20 }}
            >
              <Icon size={19} stroke={1.6} />
            </ActionIcon>
          </Tooltip>
        )
      })}
    </Group>
  )
}
