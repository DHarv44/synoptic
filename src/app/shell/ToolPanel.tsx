import { useCallback, useEffect, useRef } from 'react'
import { ActionIcon, Group, Stack, Text, Tooltip } from '@mantine/core'
import { IconX } from '@tabler/icons-react'
import { useTools } from '@/app/shell/toolStore'
import { useActiveTool } from '@/app/shell/toolRegistry'

/**
 * Left tool panel. Hosts one workbench at a time and can be dragged wider
 * or narrower by its right edge; the map takes the remaining width.
 */
export function ToolPanel() {
  const close = useTools((s) => s.close)
  const setWidthPct = useTools((s) => s.setWidthPct)
  const tool = useActiveTool()
  const draggingRef = useRef(false)

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!draggingRef.current) return
      setWidthPct((e.clientX / window.innerWidth) * 100)
    },
    [setWidthPct],
  )

  useEffect(() => {
    const stop = (): void => {
      draggingRef.current = false
      document.body.style.cursor = ''
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', stop)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', stop)
    }
  }, [onPointerMove])

  if (!tool) return null
  const Tool = tool.component

  return (
    <Stack gap={0} h="100%" style={{ position: 'relative', minHeight: 0 }}>
      <Group justify="space-between" wrap="nowrap" px="xs" py={6} style={{ flexShrink: 0 }}>
        <Text size="sm" fw={600} truncate>
          {tool.title}
        </Text>
        <Tooltip label="Close">
          <ActionIcon size="sm" variant="subtle" color="gray" aria-label="Close tool" onClick={close}>
            <IconX size={15} stroke={1.7} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Tool />
      </div>
      {/* Drag handle on the right edge — the map takes what's left. */}
      <div
        role="separator"
        aria-label="Resize tool panel"
        onPointerDown={() => {
          draggingRef.current = true
          document.body.style.cursor = 'col-resize'
        }}
        style={{
          position: 'absolute',
          top: 0,
          right: -3,
          bottom: 0,
          width: 6,
          cursor: 'col-resize',
          zIndex: 8,
        }}
      />
    </Stack>
  )
}
