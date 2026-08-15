import { useEffect, useState } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { featureEnabled } from '@/core/settings/store'
import { startPoller } from '@/core/data/scheduler'
import { useMapLayer } from '@/map/useMapLayer'
import { addDataLayer } from '@/map/layerOrder'
import type { SurfaceAnalysis } from '@/core/data/wpc/codsus'
import { WPC, centersGeoJSON, fetchSurfaceAnalysis, frontsGeoJSON } from '@/features/fronts/service'

/** WPC reissues roughly 3-hourly; polling faster only re-reads the same text. */
const POLL_MS = 30 * 60_000

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

/**
 * The surface analysis: front lines in chart colours, H/L centres with
 * pressures. Solid-vs-dashed stands in for the pip symbols (triangles and
 * semicircles) until a sprite pass — geometry and colour carry the read.
 */
export function FrontsLayer() {
  const [analysis, setAnalysis] = useState<SurfaceAnalysis | null>(null)

  useEffect(() => {
    return startPoller({
      source: WPC,
      cadenceMs: POLL_MS,
      enabled: () => featureEnabled('fronts'),
      run: async () => {
        setAnalysis(await fetchSurfaceAnalysis())
      },
    })
  }, [])

  useMapLayer((m) => {
    m.addSource('fronts', { type: 'geojson', data: EMPTY })
    m.addSource('fronts-centers', { type: 'geojson', data: EMPTY })
    // Two line layers, filtered on the dashed flag: line-dasharray is a
    // layout-time constant in MapLibre, not a data-driven property.
    addDataLayer(
      m,
      {
        id: 'fronts',
        type: 'line',
        source: 'fronts',
        filter: ['!', ['get', 'dashed']],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'width'] },
      },
      'fronts',
    )
    addDataLayer(
      m,
      {
        id: 'fronts-dashed',
        type: 'line',
        source: 'fronts',
        filter: ['get', 'dashed'],
        layout: { 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width'],
          'line-dasharray': [3, 2.5],
        },
      },
      'fronts',
    )
    addDataLayer(
      m,
      {
        id: 'fronts-centers',
        type: 'symbol',
        source: 'fronts-centers',
        layout: {
          'text-field': ['get', 'letter'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 20,
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': ['get', 'color'],
          'text-halo-color': 'rgba(0,0,0,0.7)',
          'text-halo-width': 1.4,
        },
      },
      'annotation',
    )
    addDataLayer(
      m,
      {
        id: 'fronts-pressures',
        type: 'symbol',
        source: 'fronts-centers',
        layout: {
          'text-field': ['get', 'pressure'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 10,
          'text-offset': [0, 1.4],
        },
        paint: {
          'text-color': '#c3ccd4',
          'text-halo-color': 'rgba(0,0,0,0.7)',
          'text-halo-width': 1.1,
        },
      },
      'annotation',
    )
    return () => {
      for (const id of ['fronts', 'fronts-dashed', 'fronts-centers', 'fronts-pressures']) {
        if (m.getLayer(id)) m.removeLayer(id)
      }
      for (const id of ['fronts', 'fronts-centers']) {
        if (m.getSource(id)) m.removeSource(id)
      }
    }
  }, [])

  useMapLayer(
    (m) => {
      if (!analysis) return
      const lines = m.getSource('fronts') as GeoJSONSource | undefined
      if (lines) lines.setData(frontsGeoJSON(analysis))
      const centers = m.getSource('fronts-centers') as GeoJSONSource | undefined
      if (centers) centers.setData(centersGeoJSON(analysis))
    },
    [analysis],
  )

  return null
}
