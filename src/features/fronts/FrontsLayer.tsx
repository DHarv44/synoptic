import { useEffect, useState } from 'react'
import { useComputedColorScheme } from '@mantine/core'
import type { GeoJSONSource } from 'maplibre-gl'
import { featureEnabled } from '@/core/settings/store'
import { startPoller } from '@/core/data/scheduler'
import { useMapLayer } from '@/map/useMapLayer'
import { addDataLayer } from '@/map/layerOrder'
import type { SurfaceAnalysis } from '@/core/data/wpc/codsus'
import { WPC, centersGeoJSON, fetchSurfaceAnalysis, frontsGeoJSON } from '@/features/fronts/service'
import { PIP_KINDS, makePipImage, pipImageId } from '@/features/fronts/pipIcons'

/** WPC reissues roughly 3-hourly; polling faster only re-reads the same text. */
const POLL_MS = 30 * 60_000

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

/**
 * The surface analysis: front lines with pip sprites (triangles and
 * semicircles) repeated along them, H/L centres set like chart typography.
 */
export function FrontsLayer() {
  const scheme = useComputedColorScheme('dark')
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
    const halo = scheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.85)'
    m.addSource('fronts', { type: 'geojson', data: EMPTY })
    m.addSource('fronts-centers', { type: 'geojson', data: EMPTY })
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
    addDataLayer(
      m,
      {
        id: 'fronts-centers',
        type: 'symbol',
        source: 'fronts-centers',
        layout: {
          'text-field': ['get', 'letter'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 26,
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': ['get', 'color'],
          'text-halo-color': halo,
          'text-halo-width': 1.6,
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
          'text-font': ['Noto Sans Bold'],
          'text-size': 11,
          'text-offset': [0, 1.5],
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': scheme === 'dark' ? '#c3ccd4' : '#41474d',
          'text-halo-color': halo,
          'text-halo-width': 1.2,
        },
      },
      'annotation',
    )
    return () => {
      for (const id of ['fronts', 'fronts-dashed', 'fronts-pips', 'fronts-centers', 'fronts-pressures']) {
        if (m.getLayer(id)) m.removeLayer(id)
      }
      for (const id of ['fronts', 'fronts-centers']) {
        if (m.getSource(id)) m.removeSource(id)
      }
      for (const kind of PIP_KINDS) {
        if (m.hasImage(pipImageId(kind))) m.removeImage(pipImageId(kind))
      }
    }
  }, [scheme])

  useMapLayer(
    (m) => {
      if (!analysis) return
      const lines = m.getSource('fronts') as GeoJSONSource | undefined
      if (lines) lines.setData(frontsGeoJSON(analysis))
      const centers = m.getSource('fronts-centers') as GeoJSONSource | undefined
      if (centers) centers.setData(centersGeoJSON(analysis))
    },
    // scheme is a dep because the first effect rebuilds empty sources on toggle.
    [analysis, scheme],
  )

  return null
}
