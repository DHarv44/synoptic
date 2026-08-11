import { MapView } from '@/map/MapView'
import { MapLayerControl } from '@/map/MapLayerControl'
import { DockRail } from '@/app/shell/DockRail'

/**
 * Center viewport: the map, its floating controls, and the persistent dock
 * rail pinned to the right edge (it stays put whether the panel is open or
 * collapsed — the rail itself is the show/hide affordance).
 */
export function Viewport() {
  return (
    <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
      <MapView />
      <MapLayerControl />
      <DockRail />
    </div>
  )
}
