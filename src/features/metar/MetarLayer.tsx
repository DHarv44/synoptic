import { useEffect, useRef, useState } from 'react'
import { useComputedColorScheme } from '@mantine/core'
import type { GeoJSONSource } from 'maplibre-gl'
import { fetchJson } from '@/core/data/fetchJson'
import { featureEnabled } from '@/core/settings/store'
import { startPoller } from '@/core/data/scheduler'
import { useMapContext } from '@/map/MapView'
import { useMapLayer } from '@/map/useMapLayer'
import { addDataLayer } from '@/map/layerOrder'
import { METAR_SOURCE, metarUrl, thinStations, type Metar } from '@/features/metar/service'
import { ensureStationImages, stationImageId } from '@/features/metar/stationImages'

const MIN_ZOOM = 5
/** Chart scale: a thinned national carpet of stations, the way the WPC
 * surface analysis is carpeted. Below this there is no station layer. */
const WIDE_ZOOM = 3.2
const POLL_MS = 5 * 60_000

/** Surface observation station plots (symbol layer, auto-decluttered). */
export function MetarLayer() {
  const { map } = useMapContext()
  const scheme = useComputedColorScheme('dark')
  const [stations, setStations] = useState<Metar[]>([])
  const [bboxKey, setBboxKey] = useState<string | null>(null)
  /** Sprite ids currently registered, so stale ones can be pruned. */
  const addedRef = useRef<string[]>([])

  // Track the viewport → quantized fetch key. Two regimes: a close bbox at
  // street-weather zooms, a wide heavily-thinned one at chart zooms.
  useEffect(() => {
    const update = (): void => {
      const z = map.getZoom()
      if (z < WIDE_ZOOM) {
        setBboxKey(null)
        return
      }
      const c = map.getCenter()
      if (z < MIN_ZOOM - 0.5) {
        setBboxKey(`wide:${Math.round(c.lat / 8) * 8},${Math.round(c.lng / 8) * 8}`)
      } else {
        setBboxKey(`near:${Math.round(c.lat / 4) * 4},${Math.round(c.lng / 4) * 4}`)
      }
    }
    update()
    map.on('moveend', update)
    return () => {
      map.off('moveend', update)
    }
  }, [map])

  useEffect(() => {
    if (bboxKey === null) return
    const wide = bboxKey.startsWith('wide:')
    const [latC, lonC] = bboxKey.slice(5).split(',').map(Number)
    return startPoller({
      source: METAR_SOURCE,
      cadenceMs: POLL_MS,
      enabled: () => featureEnabled('metar'),
      run: async () => {
        const data = await fetchJson<Metar[]>(
          METAR_SOURCE,
          wide
            ? metarUrl(latC - 16, lonC - 27, latC + 16, lonC + 27)
            : metarUrl(latC - 7, lonC - 10, latC + 7, lonC + 10),
          { fixture: 'metar-bbox' },
        )
        setStations(thinStations(data, wide ? 2.4 : 0.4))
      },
    })
  }, [bboxKey])

  // Source and layer exist for the life of the style. Rebuilding them per
  // fetch was tearing the layer down and back up on every pan across a
  // fetch boundary, on top of regenerating every sprite.
  useMapLayer((m) => {
    m.addSource('metar', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
    addDataLayer(
      m,
      {
        id: 'metar',
        type: 'symbol',
        source: 'metar',
        minzoom: WIDE_ZOOM,
        layout: {
          'icon-image': ['get', 'img'],
          'icon-allow-overlap': false, // built-in decluttering
          'icon-size': 1,
        },
      },
      'metar',
    )
    return () => {
      if (m.getLayer('metar')) m.removeLayer('metar')
      if (m.getSource('metar')) m.removeSource('metar')
      for (const id of addedRef.current) if (m.hasImage(id)) m.removeImage(id)
      addedRef.current = []
    }
  }, [])

  useMapLayer(
    (m) => {
      const src = m.getSource('metar') as GeoJSONSource | undefined
      if (!src) return
      src.setData({
        type: 'FeatureCollection',
        features: stations.map((s) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
          properties: { img: stationImageId(s, scheme) },
        })),
      })

      const cancel = ensureStationImages(m, stations, scheme)

      // Drop sprites for stations that scrolled out, so the atlas stays the
      // size of a viewport rather than everywhere visited this session.
      const wanted = new Set(stations.map((s) => stationImageId(s, scheme)))
      for (const id of addedRef.current) {
        if (!wanted.has(id) && m.hasImage(id)) m.removeImage(id)
      }
      addedRef.current = [...wanted]

      return cancel
    },
    [stations, scheme],
  )

  return null
}
