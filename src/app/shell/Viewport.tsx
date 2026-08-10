import { MapView } from '@/map/MapView'

/** Center viewport: the MapLibre map surface. */
export function Viewport() {
  return (
    <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
      <MapView />
    </div>
  )
}
