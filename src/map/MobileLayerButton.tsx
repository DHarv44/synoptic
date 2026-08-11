import { ActionIcon, Stack } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconStack2, IconX } from '@tabler/icons-react'
import { LayerToggles } from '@/map/LayerToggles'
import { mapChromeStyle } from '@/ui/mapChrome'

/**
 * Mobile layers control: the button expands upward into the same vertical
 * icon bar the desktop rail uses — no sheet, no dialog, just more of the
 * same control.
 */
export function MobileLayerButton({ bottom }: { bottom: number }) {
  const [open, handlers] = useDisclosure(false)

  return (
    <Stack
      gap={6}
      align="center"
      style={{ position: 'absolute', right: 12, bottom, zIndex: 6 }}
    >
      {open && (
        <Stack
          gap={0}
          align="center"
          style={{
            ...mapChromeStyle,
            width: 44,
            borderRadius: 22,
            paddingBlock: 6,
          }}
        >
          <LayerToggles />
        </Stack>
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
