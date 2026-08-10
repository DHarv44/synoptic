import { useEffect, useMemo, useState } from 'react'
import { useComputedColorScheme } from '@mantine/core'
import { fetchJson } from '@/core/data/fetchJson'
import { featureEnabled } from '@/core/settings/store'
import { startPoller } from '@/core/data/scheduler'
import { GLOBE_RADIUS, latLonToVec3 } from '@/scene/geo'
import { useCameraLatLon } from '@/scene/useCameraLatLon'
import { RENDER_ORDER } from '@/scene/renderOrder'
import { METAR_SOURCE, metarUrl, thinStations, type Metar } from '@/features/metar/service'
import { StationSprite } from '@/features/metar/StationSprite'

const SHOW_BELOW_DIST = 2.0
const POLL_MS = 5 * 60_000
const SPRITE_RADIUS = GLOBE_RADIUS * 1.004

/** Surface observation station plots; visible when zoomed in. */
export function MetarLayer() {
  const view = useCameraLatLon()
  const scheme = useComputedColorScheme('dark')
  const [stations, setStations] = useState<Metar[]>([])
  const zoomedIn = view.dist < SHOW_BELOW_DIST

  // Quantize the fetch bbox so small camera moves don't refetch.
  const bboxKey = zoomedIn
    ? `${Math.round(view.lat / 5) * 5},${Math.round(view.lon / 5) * 5}`
    : null

  useEffect(() => {
    if (bboxKey === null) return
    const [latC, lonC] = bboxKey.split(',').map(Number)
    return startPoller({
      source: METAR_SOURCE,
      cadenceMs: POLL_MS,
      enabled: () => featureEnabled('metar'),
      run: async () => {
        const data = await fetchJson<Metar[]>(
          METAR_SOURCE,
          metarUrl(latC - 8, lonC - 12, latC + 8, lonC + 12),
          { fixture: 'metar-bbox' },
        )
        setStations(thinStations(data, 0.8))
      },
    })
  }, [bboxKey])

  const cellDeg = view.dist < 1.4 ? 0.5 : 1.2
  const visible = useMemo(
    () => (zoomedIn ? thinStations(stations, cellDeg) : []),
    [stations, zoomedIn, cellDeg],
  )

  return (
    <>
      {visible.map((m) => (
        <StationSprite
          key={m.icaoId}
          metar={m}
          position={latLonToVec3(m.lat, m.lon, SPRITE_RADIUS)}
          scheme={scheme}
          renderOrder={RENDER_ORDER.probe}
        />
      ))}
    </>
  )
}
