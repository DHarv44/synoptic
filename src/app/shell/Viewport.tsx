import { MapView } from '@/map/MapView'
import { DockRail } from '@/app/shell/DockRail'
import { PlaybackControl } from '@/app/shell/PlaybackControl'

/**
 * Center viewport: the map, the floating playback control, and the
 * persistent right-edge rail (tabs above, layer toggles below). The rail
 * stays put whether the panel is open or collapsed.
 */
export function Viewport() {
  return (
    <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
      <MapView />
      <PlaybackControl />
      <DockRail />
    </div>
  )
}
