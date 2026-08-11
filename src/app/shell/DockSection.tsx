import { useState, type ReactNode } from 'react'
import { ActionIcon, Collapse, Group, Menu, Text, UnstyledButton } from '@mantine/core'
import { IconChevronDown, IconGripVertical } from '@tabler/icons-react'
import { useDock, type DockTab } from '@/app/shell/dockStore'

interface DockSectionProps {
  id: string
  tab: DockTab
  title: string
  /** Right-aligned annotation shown on the header row when collapsed. */
  hint?: ReactNode
  reorderable?: boolean
  children: ReactNode
}

/**
 * One module in a dock tab: a hairline-ruled header that expands in place.
 * Sections never scroll internally — nested scrollbars in a scrolling
 * column are unusable — so long lists cap themselves and offer "show more".
 */
export function DockSection({
  id,
  tab,
  title,
  hint,
  reorderable = true,
  children,
}: DockSectionProps) {
  const expanded = useDock((s) => s.expanded[id] ?? true)
  const toggleSection = useDock((s) => s.toggleSection)
  const moveSection = useDock((s) => s.moveSection)
  const resetOrder = useDock((s) => s.resetOrder)
  const reorder = useDock((s) => s.reorder)
  const [armed, setArmed] = useState(false)

  return (
    <div
      data-section={id}
      // Only armed by a press on the grip: a permanently draggable container
      // swallows every drag inside it (canvases, sliders, map interactions).
      draggable={armed}
      onDragStart={(e) => e.dataTransfer.setData('text/section', id)}
      onDragEnd={() => setArmed(false)}
      onDragOver={(e) => {
        if (reorderable) e.preventDefault()
      }}
      onDrop={(e) => {
        const dragged = e.dataTransfer.getData('text/section')
        if (!dragged || dragged === id) return
        e.preventDefault()
        const ids = [...(useDock.getState().order[tab] ?? [])]
        const from = ids.indexOf(dragged)
        const to = ids.indexOf(id)
        if (from < 0 || to < 0) return
        ids.splice(to, 0, ...ids.splice(from, 1))
        reorder(tab, ids)
      }}
      style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
    >
      <Group gap={4} wrap="nowrap" py={6} px={4}>
        {reorderable && (
          <Menu position="bottom-start" withinPortal>
            <Menu.Target>
              <ActionIcon
                size="sm"
                variant="subtle"
                color="gray"
                aria-label={`Reorder ${title}`}
                onPointerDown={() => setArmed(true)}
                onPointerUp={() => setArmed(false)}
                style={{ cursor: 'grab' }}
              >
                <IconGripVertical size={13} stroke={1.6} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => moveSection(tab, id, -1)}>Move up</Menu.Item>
              <Menu.Item onClick={() => moveSection(tab, id, 1)}>Move down</Menu.Item>
              <Menu.Divider />
              <Menu.Item onClick={() => resetOrder(tab)}>Reset order</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
        <UnstyledButton
          onClick={() => toggleSection(id)}
          style={{ flex: 1, minWidth: 0 }}
          aria-expanded={expanded}
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
      </Group>
      <Collapse expanded={expanded}>
        <div style={{ padding: '2px 4px 12px' }}>{children}</div>
      </Collapse>
    </div>
  )
}
