import { useEffect, useState } from 'react'
import { useComputedColorScheme } from '@mantine/core'
import type { GeoJSONSource } from 'maplibre-gl'
import { useFeatureOption } from '@/core/settings/store'
import { fetchGridField } from '@/core/data/gfsGrid'
import { useMapLayer } from '@/map/useMapLayer'
import { addDataLayer } from '@/map/layerOrder'
import { FIELD_SPECS, fieldChart, type FieldChart } from '@/features/fields/service'

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
const EMPTY_CHART: FieldChart = { contours: EMPTY, centers: null }

/**
 * Contoured GFS analysis fields — isobars and friends. Chart brown, the
 * way reference isolines have been inked since the telegraph: present
 * enough to be the skeleton of the scene, never competing with data hues.
 */
export function FieldsLayer() {
  const scheme = useComputedColorScheme('dark')
  const field = useFeatureOption<string>('fields', 'field')
  const opacity = useFeatureOption<number>('fields', 'opacity')
  const mslpInterval = useFeatureOption<string>('fields', 'mslpInterval')
  const reduction = useFeatureOption<string>('fields', 'reduction')
  const [chart, setChart] = useState<FieldChart>(EMPTY_CHART)

  useEffect(() => {
    let stale = false
    setChart(EMPTY_CHART)
    const spec = FIELD_SPECS[field] ?? FIELD_SPECS.mslp
    const interval = field === 'mslp' ? Number(mslpInterval) || spec.interval : undefined
    // Both sea-level reductions stay available; the server serves each as
    // its own grid key.
    const gridKey = field === 'mslp' && reduction === 'prmsl' ? 'mslp_prmsl' : spec.key
    fetchGridField(gridKey)
      .then((grid) => {
        if (!stale) setChart(fieldChart(grid, spec, interval))
      })
      .catch(() => {
        // Health strip already carries the error; the layer just stays empty.
      })
    return () => {
      stale = true
    }
  }, [field, mslpInterval, reduction])

  useMapLayer((m) => {
    const ink = scheme === 'dark' ? '#cdb38a' : '#8a6d3b'
    const halo = scheme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)'
    m.addSource('fields', { type: 'geojson', data: EMPTY })
    m.addSource('fields-centers', { type: 'geojson', data: EMPTY })
    addDataLayer(
      m,
      {
        id: 'fields',
        type: 'line',
        source: 'fields',
        layout: { 'line-join': 'round' },
        paint: {
          'line-color': ink,
          'line-width': 1.1,
        },
      },
      'fields',
    )
    addDataLayer(
      m,
      {
        id: 'fields-labels',
        type: 'symbol',
        source: 'fields',
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 320,
          'text-field': ['get', 'label'],
          'text-size': 10.5,
          'text-font': ['Noto Sans Bold'],
          'text-padding': 4,
        },
        paint: {
          'text-color': ink,
          'text-halo-color': halo,
          'text-halo-width': 1.4,
        },
      },
      'fields',
    )
    // H/L marks from the same field the contours came from, chart typography.
    addDataLayer(
      m,
      {
        id: 'fields-centers',
        type: 'symbol',
        source: 'fields-centers',
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
        id: 'fields-center-values',
        type: 'symbol',
        source: 'fields-centers',
        layout: {
          'text-field': ['get', 'value'],
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
      for (const id of ['fields', 'fields-labels', 'fields-centers', 'fields-center-values']) {
        if (m.getLayer(id)) m.removeLayer(id)
      }
      for (const id of ['fields', 'fields-centers']) if (m.getSource(id)) m.removeSource(id)
    }
  }, [scheme])

  useMapLayer(
    (m) => {
      const src = m.getSource('fields') as GeoJSONSource | undefined
      if (src) src.setData(chart.contours)
      const centers = m.getSource('fields-centers') as GeoJSONSource | undefined
      if (centers) centers.setData(chart.centers ?? EMPTY)
      if (m.getLayer('fields')) m.setPaintProperty('fields', 'line-opacity', opacity / 100)
      if (m.getLayer('fields-labels')) {
        m.setPaintProperty('fields-labels', 'text-opacity', opacity / 100)
      }
    },
    // scheme is a dep because the first effect rebuilds an empty source on toggle.
    [chart, scheme, opacity],
  )

  return null
}
