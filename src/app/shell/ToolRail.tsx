import { Stack, Tooltip, UnstyledButton } from '@mantine/core'
import { useTools } from '@/app/shell/toolStore'
import { useAvailableTools } from '@/app/shell/toolRegistry'
import { mapChromeStyle } from '@/ui/mapChrome'
import type { ToolContribution } from '@/core/settings/types'

export const RAIL_WIDTH = 44

function ToolButton({ tool }: { tool: ToolContribution }) {
  const active = useTools((s) => s.active === tool.id)
  const toggle = useTools((s) => s.toggle)
  const Icon = tool.icon

  return (
    <Tooltip label={active ? `Hide ${tool.title}` : tool.title} position="right" openDelay={300}>
      <UnstyledButton
        onClick={() => toggle(tool.id)}
        aria-label={tool.title}
        aria-pressed={active}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: RAIL_WIDTH,
          height: 44,
          color: active ? 'var(--mantine-color-text)' : 'var(--mantine-color-dimmed)',
          background: active ? 'var(--mantine-color-default-hover)' : 'transparent',
          boxShadow: active ? 'inset -2px 0 0 var(--mantine-primary-color-filled)' : 'none',
        }}
      >
        <Icon size={19} stroke={1.6} />
      </UnstyledButton>
    </Tooltip>
  )
}

/**
 * Left rail: tool workbenches (3D echo, and future views with their own
 * camera and navigation). Mirrors the right rail — readouts dock right,
 * tools open left.
 */
export function ToolRail() {
  const tools = useAvailableTools()
  if (tools.length === 0) return null

  return (
    <Stack
      gap={0}
      style={{
        ...mapChromeStyle,
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: RAIL_WIDTH,
        zIndex: 6,
        borderRight: '1px solid var(--mantine-color-default-border)',
        boxShadow: 'none',
      }}
    >
      {tools.map((t) => (
        <ToolButton key={t.id} tool={t} />
      ))}
    </Stack>
  )
}
