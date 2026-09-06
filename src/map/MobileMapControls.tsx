import { ActionIcon, ScrollArea, Stack } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconStack2, IconX } from '@tabler/icons-react'
import { CompassButton } from '@/map/CompassButton'
import { LayerToggles } from '@/map/LayerToggles'
import { LocateButton } from '@/map/LocateButton'
import { mapChromeStyle } from '@/ui/mapChrome'

const BUTTON = 44

/**
 * The phone's map controls: one column on the right edge above the
 * playback bar, the way every phone map does it. Bottom to top: locate
 * (nearest the thumb), the compass only while the map is turned, and
 * layers, whose labelled menu opens upward over nothing but map. The
 * desktop rail's bare-icon column relied on hover tooltips for names — on
 * touch that was eighteen mystery glyphs.
 */
export function MobileMapControls({ bottom }: { bottom: number }) {
  const [open, handlers] = useDisclosure(false)

  return (
    <Stack
      gap={8}
      align="flex-end"
      style={{ position: 'absolute', right: 12, bottom, zIndex: 6 }}
    >
      {open && (
        <ScrollArea.Autosize
          mah={`calc(100dvh - ${bottom + 44 + 2 * (BUTTON + 8) + 24}px)`}
          type="auto"
          style={{ ...mapChromeStyle, width: 200, borderRadius: 12, paddingBlock: 6 }}
        >
          <LayerToggles labeled />
        </ScrollArea.Autosize>
      )}
      <ActionIcon
        size={BUTTON}
        variant="default"
        aria-label={open ? 'Close layers' : 'Layers'}
        aria-expanded={open}
        onClick={handlers.toggle}
        style={{ ...mapChromeStyle, borderRadius: BUTTON / 2 }}
      >
        {open ? <IconX size={20} stroke={1.7} /> : <IconStack2 size={21} stroke={1.6} />}
      </ActionIcon>
      <CompassButton size={BUTTON} />
      <LocateButton size={BUTTON} floating={false} />
    </Stack>
  )
}
