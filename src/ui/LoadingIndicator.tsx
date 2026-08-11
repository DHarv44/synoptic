import { Loader, Tooltip } from '@mantine/core'
import { useHealth } from '@/core/data/healthStore'
import { mapChromeStyle } from '@/ui/mapChrome'

/**
 * Shows while any layer or panel is fetching — data requests and map tile
 * loads alike. Placed over the map so a slow source is visible without
 * hunting through health dots.
 */
export function LoadingIndicator({ top, right }: { top: number; right: number }) {
  const busy = useHealth((s) => s.inFlight > 0 || s.mapBusy)
  if (!busy) return null

  return (
    <Tooltip label="Loading data…" position="left">
      <div
        aria-label="Loading data"
        role="status"
        style={{
          ...mapChromeStyle,
          position: 'absolute',
          top,
          right,
          zIndex: 6,
          width: 30,
          height: 30,
          borderRadius: 15,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Loader size={16} color="gray" />
      </div>
    </Tooltip>
  )
}
