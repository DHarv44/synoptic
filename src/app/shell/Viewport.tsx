import { ActionIcon, Tooltip } from '@mantine/core'
import { IconChevronLeft } from '@tabler/icons-react'
import { MapView } from '@/map/MapView'
import { MapLayerControl } from '@/map/MapLayerControl'
import { useDock } from '@/app/shell/dockStore'
import { mapChromeStyle } from '@/ui/mapChrome'

/** Center viewport: the map surface plus its floating controls. */
export function Viewport() {
  const dockOpen = useDock((s) => s.open)
  const toggleDock = useDock((s) => s.toggleOpen)

  return (
    <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
      <MapView />
      <MapLayerControl />
      {!dockOpen && (
        <Tooltip label="Show analysis panel" position="left">
          <ActionIcon
            size="lg"
            variant="default"
            aria-label="Show analysis panel"
            onClick={toggleDock}
            style={{
              ...mapChromeStyle,
              position: 'absolute',
              top: '50%',
              right: 8,
              transform: 'translateY(-50%)',
              zIndex: 5,
            }}
          >
            <IconChevronLeft size={18} stroke={1.6} />
          </ActionIcon>
        </Tooltip>
      )}
    </div>
  )
}
