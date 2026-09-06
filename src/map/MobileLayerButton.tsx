import { ActionIcon, ScrollArea, Stack } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconStack2, IconX } from '@tabler/icons-react'
import { LayerToggles } from '@/map/LayerToggles'
import { mapChromeStyle } from '@/ui/mapChrome'

/**
 * Mobile layers control: the button expands upward into a labeled, scrolling
 * menu. The desktop rail's bare-icon column relied on hover tooltips for
 * names — on touch that was eighteen mystery glyphs — and uncapped it grew
 * clean under the top bar on any phone.
 */
export function MobileLayerButton({ bottom }: { bottom: number }) {
  const [open, handlers] = useDisclosure(false)

  return (
    <Stack
      gap={6}
      align="flex-end"
      style={{ position: 'absolute', right: 12, bottom, zIndex: 6 }}
    >
      {open && (
        <ScrollArea.Autosize
          mah={`calc(100dvh - ${bottom + 170}px)`}
          type="auto"
          style={{
            ...mapChromeStyle,
            width: 200,
            borderRadius: 12,
            paddingBlock: 6,
          }}
        >
          <LayerToggles labeled />
        </ScrollArea.Autosize>
      )}
      <ActionIcon
        size={44}
        radius="xl"
        variant="default"
        aria-label={open ? 'Close layers' : 'Layers'}
        aria-expanded={open}
        onClick={handlers.toggle}
        style={{ ...mapChromeStyle, borderRadius: 22 }}
      >
        {open ? <IconX size={20} stroke={1.7} /> : <IconStack2 size={21} stroke={1.6} />}
      </ActionIcon>
    </Stack>
  )
}
