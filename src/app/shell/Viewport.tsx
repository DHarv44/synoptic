import { MapView } from '@/map/MapView'
import { DockRail } from '@/app/shell/DockRail'
import { PlaybackControl } from '@/app/shell/PlaybackControl'
import { MobileSheet } from '@/app/shell/MobileSheet'
import { MobileLayerButton } from '@/map/MobileLayerButton'

/**
 * Center viewport. Desktop: map with a persistent right-edge rail (tabs
 * above, layer toggles below). Mobile: map with a bottom sheet for panels
 * and a thumb-reachable layers button — no rail.
 */
export function Viewport({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
      <MapView />
      <PlaybackControl isMobile={isMobile} />
      {isMobile ? (
        <>
          <MobileLayerButton bottom={160} />
          <MobileSheet />
        </>
      ) : (
        <DockRail />
      )}
    </div>
  )
}
