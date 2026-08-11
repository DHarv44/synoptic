import { MapView } from '@/map/MapView'
import { DockRail } from '@/app/shell/DockRail'
import { PlaybackControl } from '@/app/shell/PlaybackControl'
import { MobileSheet, TAB_BAR_HEIGHT } from '@/app/shell/MobileSheet'
import { MobileLayerButton } from '@/map/MobileLayerButton'
import { LoadingIndicator } from '@/ui/LoadingIndicator'
import { ReorientButton } from '@/ui/ReorientButton'
import { LocateButton } from '@/map/LocateButton'
import { useCameraStore } from '@/map/cameraStore'
import { ToolRail } from '@/app/shell/ToolRail'
import { MobileToolBar } from '@/app/shell/MobileToolBar'

/**
 * Center viewport. Desktop: map with a persistent right-edge rail (tabs
 * above, layer toggles below). Mobile: map with a bottom sheet for panels
 * and a thumb-reachable layers button — no rail.
 */
export function Viewport({ isMobile }: { isMobile: boolean }) {
  const resetNorth = useCameraStore((s) => s.requestResetNorth)

  return (
    <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
      <MapView />
      <PlaybackControl isMobile={isMobile} />
      {isMobile ? (
        <>
          <MobileLayerButton bottom={TAB_BAR_HEIGHT + 66} />
          {/* Beside the layers button, so expanding it doesn't overlap. */}
          <ReorientButton
            onClick={resetNorth}
            size={44}
            label="North up"
            style={{ right: 64, bottom: TAB_BAR_HEIGHT + 66 }}
          />
          <LocateButton size={44} style={{ right: 116, bottom: TAB_BAR_HEIGHT + 66 }} />
          <LoadingIndicator top={12} right={12} />
          <MobileToolBar />
          <MobileSheet />
        </>
      ) : (
        <>
          <ToolRail />
          <DockRail />
          <ReorientButton
            onClick={resetNorth}
            label="North up"
            style={{ right: 52, bottom: 8 }}
          />
          <LocateButton style={{ right: 52, bottom: 50 }} />
          <LoadingIndicator top={12} right={56} />
        </>
      )}
    </div>
  )
}
