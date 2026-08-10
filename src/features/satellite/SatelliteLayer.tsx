import { useFeatureOption } from '@/core/settings/store'
import { useTimeline } from '@/core/time/timelineStore'
import { TileLayer } from '@/scene/tiles/TileLayer'
import { GLOBE_RADIUS } from '@/scene/geo'
import { RENDER_ORDER } from '@/scene/renderOrder'
import { GIBS, gibsDate, gibsTileUrl } from '@/features/satellite/service'

const LAYER_RADIUS = GLOBE_RADIUS * 1.0004

/** NASA GIBS satellite imagery draped under the radar layer. */
export function SatelliteLayer() {
  const simTime = useTimeline((s) => s.simTime)
  const product = useFeatureOption<string>('satellite', 'product')
  const opacity = useFeatureOption<number>('satellite', 'opacity')
  const date = gibsDate(simTime, Date.now())

  return (
    <TileLayer
      urlFor={(z, x, y) => gibsTileUrl(product, date, z, x, y)}
      radius={LAYER_RADIUS}
      opacity={opacity / 100}
      renderOrder={RENDER_ORDER.satellite}
      source={GIBS}
    />
  )
}
