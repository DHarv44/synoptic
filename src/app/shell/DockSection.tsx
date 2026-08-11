import type { ReactNode } from 'react'
import { Collapse, Group, Text, UnstyledButton } from '@mantine/core'
import { IconChevronDown } from '@tabler/icons-react'
import { useDock } from '@/app/shell/dockStore'

interface DockSectionProps {
  id: string
  title: string
  /** Right-aligned annotation shown on the header row while collapsed. */
  hint?: ReactNode
  children: ReactNode
}

/**
 * One module in a dock tab: a hairline-ruled header that expands in place.
 * Sections never scroll internally — nested scrollbars in a scrolling
 * column are unusable — so long lists cap themselves and offer "show more".
 */
export function DockSection({ id, title, hint, children }: DockSectionProps) {
  const expanded = useDock((s) => s.expanded[id] ?? true)
  const toggleSection = useDock((s) => s.toggleSection)

  return (
    <div
      data-section={id}
      style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
    >
      <UnstyledButton
        onClick={() => toggleSection(id)}
        aria-expanded={expanded}
        style={{ display: 'block', width: '100%', padding: '6px 4px' }}
      >
        <Group gap={6} wrap="nowrap" justify="space-between">
          <Text size="xs" fw={700} tt="uppercase" lts={0.8} c="dimmed">
            {title}
          </Text>
          <Group gap={4} wrap="nowrap">
            {!expanded && hint}
            <IconChevronDown
              size={14}
              stroke={1.8}
              style={{
                transform: expanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 120ms',
                opacity: 0.5,
                flexShrink: 0,
              }}
            />
          </Group>
        </Group>
      </UnstyledButton>
      <Collapse expanded={expanded}>
        <div style={{ padding: '2px 4px 12px' }}>{children}</div>
      </Collapse>
    </div>
  )
}
