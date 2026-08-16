import { useEffect, useState } from 'react'
import { useComputedColorScheme } from '@mantine/core'
import type { GeoJSONSource } from 'maplibre-gl'
import { fetchJson } from '@/core/data/fetchJson'
import { featureEnabled, useFeatureOption } from '@/core/settings/store'
import { startPoller } from '@/core/data/scheduler'
import { useMapContext } from '@/map/MapView'
import { useMapLayer } from '@/map/useMapLayer'
import { addDataLayer } from '@/map/layerOrder'
import {
  NWPS,
  gaugeGeoJSON,
  gaugesUrl,
  reportingGauges,
  type Gauge,
  type GaugesResponse,
} from '@/features/gauges/service'

const MIN_ZOOM = 6
const POLL_MS = 15 * 60_000

/** River gauges coloured by flood category, viewport-following like METARs. */
export function GaugesLayer() {
  const { map } = useMapContext()
  const scheme = useComputedColorScheme('dark')
  const floodingOnly = useFeatureOption<boolean>('gauges', 'floodingOnly')
  const [gauges, setGauges] = useState<Gauge[]>([])
  const [bboxKey, setBboxKey] = useState<string | null>(null)

  useEffect(() => {
    const update = (): void => {
      if (map.getZoom() < MIN_ZOOM - 0.5) {
        setBboxKey(null)
        return
      }
      const c = map.getCenter()
      setBboxKey(`${Math.round(c.lat / 2) * 2},${Math.round(c.lng / 2) * 2}`)
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
      source: NWPS,
      cadenceMs: POLL_MS,
      enabled: () => featureEnabled('gauges'),
      run: async () => {
        const data = await fetchJson<GaugesResponse>(
          NWPS,
          gaugesUrl(latC - 2.5, lonC - 3.5, latC + 2.5, lonC + 3.5),
          { fixture: 'nwps-gauges' },
        )
        setGauges(data.gauges)
      },
    })
  }, [bboxKey])

  useMapLayer((m) => {
    m.addSource('gauges', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
    addDataLayer(
      m,
      {
        id: 'gauges',
        type: 'circle',
        source: 'gauges',
        minzoom: MIN_ZOOM,
        paint: {
          // Flooding gauges earn size along with colour.
          'circle-radius': ['+', 3, ['*', 1.2, ['get', 'rank']]],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.9,
          'circle-stroke-width': 1.2,
          'circle-stroke-color': scheme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
        },
      },
      'gauges',
    )
    return () => {
      if (m.getLayer('gauges')) m.removeLayer('gauges')
      if (m.getSource('gauges')) m.removeSource('gauges')
    }
  }, [scheme])

  useMapLayer(
    (m) => {
      const src = m.getSource('gauges') as GeoJSONSource | undefined
      src?.setData(gaugeGeoJSON(reportingGauges(gauges, floodingOnly)))
    },
    // scheme is a dep because the first effect rebuilds an empty source on toggle.
    [gauges, floodingOnly, scheme],
  )

  return null
}
