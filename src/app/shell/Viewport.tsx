import { MapView } from '@/map/MapView'
import { MapLayerControl } from '@/map/MapLayerControl'

/** Center viewport: the map surface plus its floating controls. */
export function Viewport({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
      <MapView />
      <MapLayerControl onOpenSettings={onOpenSettings} />
    </div>
  )
}
