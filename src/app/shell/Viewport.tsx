import { MapView } from '@/map/MapView'
import { DockRail } from '@/app/shell/DockRail'
import { PlaybackControl } from '@/app/shell/PlaybackControl'
import { MobileSheet, TAB_BAR_HEIGHT } from '@/app/shell/MobileSheet'
import { MobileMapControls } from '@/map/MobileMapControls'
import { LoadingIndicator } from '@/ui/LoadingIndicator'
import { ReorientButton } from '@/ui/ReorientButton'
import { LocateButton } from '@/map/LocateButton'
import { useCameraStore } from '@/map/cameraStore'
import { ToolRail } from '@/app/shell/ToolRail'
import { MobileToolBar } from '@/app/shell/MobileToolBar'
import { MapLegends } from '@/app/shell/MapLegends'

/** Mobile: the control column sits just above the playback bar. */
const MOBILE_CONTROLS_BOTTOM = TAB_BAR_HEIGHT + 70

/**
 * Center viewport. Desktop: map with a persistent right-edge rail (tabs
 * above, layer toggles below). Mobile: map with a bottom sheet for panels
 * and a right-edge column of map controls — no rail.
 */
export function Viewport({ isMobile }: { isMobile: boolean }) {
  const resetNorth = useCameraStore((s) => s.requestResetNorth)

  return (
    <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
      <MapView />
      <MapLegends isMobile={isMobile} />
      <PlaybackControl isMobile={isMobile} />
      {isMobile ? (
        <>
          <MobileMapControls bottom={MOBILE_CONTROLS_BOTTOM} />
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
