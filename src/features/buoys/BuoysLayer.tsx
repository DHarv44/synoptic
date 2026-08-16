import { useEffect, useState } from 'react'
import { useComputedColorScheme } from '@mantine/core'
import type { GeoJSONSource } from 'maplibre-gl'
import { fetchJson } from '@/core/data/fetchJson'
import { featureEnabled } from '@/core/settings/store'
import { startPoller } from '@/core/data/scheduler'
import { useUnitSystem } from '@/core/units/useUnitSystem'
import { useMapLayer } from '@/map/useMapLayer'
import { addDataLayer } from '@/map/layerOrder'
import { BUOYS_URL, NDBC_SOURCE, buoyGeoJSON, marineBuoys, type Buoy } from '@/features/buoys/service'

const MIN_ZOOM = 3
const POLL_MS = 10 * 60_000

/** Marine buoys coloured by wave height. One global file — no bbox chasing. */
export function BuoysLayer() {
  const scheme = useComputedColorScheme('dark')
  const system = useUnitSystem()
  const [buoys, setBuoys] = useState<Buoy[]>([])

  useEffect(
    () =>
      startPoller({
        source: NDBC_SOURCE,
        cadenceMs: POLL_MS,
        enabled: () => featureEnabled('buoys'),
        run: async () => {
          const data = await fetchJson<Buoy[]>(NDBC_SOURCE, BUOYS_URL, { fixture: 'ndbc-latest' })
          setBuoys(marineBuoys(data, Date.now()))
        },
      }),
    [],
  )

  useMapLayer((m) => {
    m.addSource('buoys', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
    addDataLayer(
      m,
      {
        id: 'buoys',
        type: 'circle',
        source: 'buoys',
        minzoom: MIN_ZOOM,
        paint: {
          'circle-radius': 4,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.95,
          'circle-stroke-width': 1.2,
          // Light stroke in dark mode: calm-blue dots were invisible on night ocean.
          'circle-stroke-color': scheme === 'dark' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)',
        },
      },
      'buoys',
    )
    addDataLayer(
      m,
      {
        id: 'buoys-label',
        type: 'symbol',
        source: 'buoys',
        minzoom: MIN_ZOOM + 2,
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 10,
          'text-offset': [0, 1.1],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': scheme === 'dark' ? '#cdd3d9' : '#333',
          'text-halo-color': scheme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)',
          'text-halo-width': 1,
        },
      },
      'buoys',
    )
    return () => {
      for (const id of ['buoys-label', 'buoys']) if (m.getLayer(id)) m.removeLayer(id)
      if (m.getSource('buoys')) m.removeSource('buoys')
    }
  }, [scheme])

  useMapLayer(
    (m) => {
      const src = m.getSource('buoys') as GeoJSONSource | undefined
      src?.setData(buoyGeoJSON(buoys, system))
    },
    // scheme is a dep because the first effect rebuilds an empty source on toggle.
    [buoys, system, scheme],
  )

  return null
}
