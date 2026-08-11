import { ActionIcon, Drawer, Text } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconStack2 } from '@tabler/icons-react'
import { LayerToggles } from '@/map/LayerToggles'
import { mapChromeStyle } from '@/ui/mapChrome'

/** Layers as a thumb-reachable map button opening a bottom sheet (mobile). */
export function MobileLayerButton({ bottom }: { bottom: number }) {
  const [opened, handlers] = useDisclosure(false)

  return (
    <>
      <ActionIcon
        size={44}
        radius="xl"
        variant="default"
        aria-label="Layers"
        onClick={handlers.open}
        style={{ ...mapChromeStyle, position: 'absolute', right: 12, bottom, zIndex: 6 }}
      >
        <IconStack2 size={21} stroke={1.6} />
      </ActionIcon>
      <Drawer
        opened={opened}
        onClose={handlers.close}
        position="bottom"
        size="auto"
        title="Layers"
        zIndex={20}
      >
        <LayerToggles horizontal />
        <Text size="xs" c="dimmed" mt="sm">
          Opacity, colour tables and products are in Settings.
        </Text>
      </Drawer>
    </>
  )
}
