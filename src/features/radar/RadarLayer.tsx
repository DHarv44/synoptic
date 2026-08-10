import { useEffect, useState } from 'react'
import { fetchJson } from '@/core/data/fetchJson'
import { startPoller } from '@/core/data/scheduler'
import { featureEnabled, useFeatureOption } from '@/core/settings/store'
import { useTimeline } from '@/core/time/timelineStore'
import { TileLayer } from '@/scene/tiles/TileLayer'
import { GLOBE_RADIUS } from '@/scene/geo'
import { RENDER_ORDER } from '@/scene/renderOrder'
import {
  RAINVIEWER,
  WEATHER_MAPS_URL,
  allFrames,
  pickFrame,
  tileUrl,
  type RainViewerMaps,
} from '@/features/radar/service'

const POLL_MS = 120_000
const LAYER_RADIUS = GLOBE_RADIUS * 1.0008

/** Global composite radar (RainViewer), animated by the timeline. */
export function RadarLayer() {
  const [maps, setMaps] = useState<RainViewerMaps | null>(null)
  const simTime = useTimeline((s) => s.simTime)
  const scheme = useFeatureOption<string>('radar', 'scheme')
  const smooth = useFeatureOption<boolean>('radar', 'smooth')
  const opacity = useFeatureOption<number>('radar', 'opacity')

  useEffect(() => {
    return startPoller({
      source: RAINVIEWER,
      cadenceMs: POLL_MS,
      enabled: () => featureEnabled('radar'),
      run: async () => {
        const data = await fetchJson<RainViewerMaps>(RAINVIEWER, WEATHER_MAPS_URL, {
          fixture: 'rainviewer-maps',
        })
        setMaps(data)
      },
    })
  }, [])

  if (!maps) return null
  const frame = pickFrame(allFrames(maps), simTime)
  if (!frame) return null

  return (
    <TileLayer
      urlFor={(z, x, y) => tileUrl(maps, frame, z, x, y, scheme, smooth)}
      radius={LAYER_RADIUS}
      opacity={opacity / 100}
      renderOrder={RENDER_ORDER.tiles}
      source={RAINVIEWER}
    />
  )
}
