import { MapView } from '@/map/MapView'
import { DockRail } from '@/app/shell/DockRail'
import { PlaybackControl } from '@/app/shell/PlaybackControl'
import { MobileSheet, TAB_BAR_HEIGHT } from '@/app/shell/MobileSheet'
import { MobileLayerButton } from '@/map/MobileLayerButton'
import { LoadingIndicator } from '@/ui/LoadingIndicator'

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
          <MobileLayerButton bottom={TAB_BAR_HEIGHT + 66} />
          <LoadingIndicator top={12} right={12} />
          <MobileSheet />
        </>
      ) : (
        <>
          <DockRail />
          <LoadingIndicator top={12} right={56} />
        </>
      )}
    </div>
  )
}
