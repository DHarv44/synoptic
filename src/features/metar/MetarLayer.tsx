import { useEffect, useState } from 'react'
import { useComputedColorScheme } from '@mantine/core'
import { fetchJson } from '@/core/data/fetchJson'
import { featureEnabled } from '@/core/settings/store'
import { startPoller } from '@/core/data/scheduler'
import { useMapContext } from '@/map/MapView'
import { useMapLayer } from '@/map/useMapLayer'
import { METAR_SOURCE, metarUrl, thinStations, type Metar } from '@/features/metar/service'
import { makeStationCanvas, STATION_COLORS } from '@/features/metar/drawStationModel'

const MIN_ZOOM = 5
const POLL_MS = 5 * 60_000

/** Surface observation station plots (symbol layer, auto-decluttered). */
export function MetarLayer() {
  const { map } = useMapContext()
  const scheme = useComputedColorScheme('dark')
  const [stations, setStations] = useState<Metar[]>([])
  const [bboxKey, setBboxKey] = useState<string | null>(null)

  // Track the viewport → quantized fetch key (only when zoomed in enough).
  useEffect(() => {
    const update = (): void => {
      if (map.getZoom() < MIN_ZOOM - 0.5) {
        setBboxKey(null)
        return
      }
      const c = map.getCenter()
      setBboxKey(`${Math.round(c.lat / 4) * 4},${Math.round(c.lng / 4) * 4}`)
    }
    update()
    map.on('moveend', update)
    return () => {
      map.off('moveend', update)
    }
  }, [map])

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
          metarUrl(latC - 7, lonC - 10, latC + 7, lonC + 10),
          { fixture: 'metar-bbox' },
        )
        setStations(thinStations(data, 0.4))
      },
    })
  }, [bboxKey])

  useMapLayer(
    (m) => {
      const ids: string[] = []
      for (const s of stations) {
        const imgId = `metar-${s.icaoId}-${scheme}`
        if (!m.hasImage(imgId)) {
          const canvas = makeStationCanvas(s, STATION_COLORS[scheme])
          const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
          m.addImage(imgId, ctx.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio: 2 })
        }
        ids.push(imgId)
      }
      m.addSource('metar', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: stations.map((s) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
            properties: { img: `metar-${s.icaoId}-${scheme}` },
          })),
        },
      })
      m.addLayer({
        id: 'metar',
        type: 'symbol',
        source: 'metar',
        minzoom: MIN_ZOOM,
        layout: {
          'icon-image': ['get', 'img'],
          'icon-allow-overlap': false, // built-in decluttering
          'icon-size': 1,
        },
      })
      return () => {
        if (m.getLayer('metar')) m.removeLayer('metar')
        if (m.getSource('metar')) m.removeSource('metar')
        for (const id of ids) {
          if (m.hasImage(id)) m.removeImage(id)
        }
      }
    },
    [stations, scheme],
  )

  return null
}
