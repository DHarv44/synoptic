import { useEffect, useState } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { featureEnabled } from '@/core/settings/store'
import { startPoller } from '@/core/data/scheduler'
import { useMapLayer } from '@/map/useMapLayer'
import { addDataLayer } from '@/map/layerOrder'
import type { SurfaceAnalysis } from '@/core/data/wpc/codsus'
import { WPC, fetchSurfaceAnalysis, frontsGeoJSON } from '@/features/fronts/service'
import { PIP_KINDS, makePipImage, pipImageId } from '@/features/fronts/pipIcons'

/** WPC reissues roughly 3-hourly; polling faster only re-reads the same text. */
const POLL_MS = 30 * 60_000

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

/**
 * The surface analysis fronts: lines with pip sprites (triangles and
 * semicircles) repeated along them. H/L centres deliberately come from the
 * fields feature instead — marked on the same grid its isolines are traced
 * from, so centres and rings can never disagree. WPC's bulletin centres
 * are hand-placed on an unpublished pressure field and float ringless over
 * a model field that disagrees by several hPa over terrain.
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
    for (const kind of PIP_KINDS) {
      if (!m.hasImage(pipImageId(kind))) {
        m.addImage(pipImageId(kind), makePipImage(kind), { pixelRatio: 2 })
      }
    }
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
    // Pips ride the lines as map-aligned sprites; overlap is forced on so
    // the pattern never thins out where symbols would collide.
    addDataLayer(
      m,
      {
        id: 'fronts-pips',
        type: 'symbol',
        source: 'fronts',
        filter: ['!', ['get', 'dashed']],
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 46,
          'icon-image': ['concat', 'front-pip-', ['get', 'kind']],
          'icon-rotation-alignment': 'map',
          'icon-pitch-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-padding': 0,
        },
      },
      'fronts',
    )
    return () => {
      for (const id of ['fronts', 'fronts-dashed', 'fronts-pips']) {
        if (m.getLayer(id)) m.removeLayer(id)
      }
      if (m.getSource('fronts')) m.removeSource('fronts')
      for (const kind of PIP_KINDS) {
        if (m.hasImage(pipImageId(kind))) m.removeImage(pipImageId(kind))
      }
    }
  }, [])

  useMapLayer(
    (m) => {
      if (!analysis) return
      const lines = m.getSource('fronts') as GeoJSONSource | undefined
      if (lines) lines.setData(frontsGeoJSON(analysis))
    },
    [analysis],
  )

  return null
}
