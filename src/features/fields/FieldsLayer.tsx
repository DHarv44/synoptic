import { useEffect, useState } from 'react'
import { useComputedColorScheme } from '@mantine/core'
import type { GeoJSONSource } from 'maplibre-gl'
import { useFeatureOption } from '@/core/settings/store'
import { fetchGridField } from '@/core/data/gfsGrid'
import { useMapLayer } from '@/map/useMapLayer'
import { addDataLayer } from '@/map/layerOrder'
import { FIELD_SPECS, fieldGeoJSON } from '@/features/fields/service'

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

/**
 * Contoured GFS analysis fields — isobars and friends. Chart brown, the
 * way reference isolines have been inked since the telegraph: present
 * enough to be the skeleton of the scene, never competing with data hues.
 */
export function FieldsLayer() {
  const scheme = useComputedColorScheme('dark')
  const field = useFeatureOption<string>('fields', 'field')
  const opacity = useFeatureOption<number>('fields', 'opacity')
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection>(EMPTY)

  useEffect(() => {
    let stale = false
    setGeojson(EMPTY)
    const spec = FIELD_SPECS[field] ?? FIELD_SPECS.mslp
    fetchGridField(spec.key)
      .then((grid) => {
        if (!stale) setGeojson(fieldGeoJSON(grid, spec))
      })
      .catch(() => {
        // Health strip already carries the error; the layer just stays empty.
      })
    return () => {
      stale = true
    }
  }, [field])

  useMapLayer((m) => {
    const ink = scheme === 'dark' ? '#cdb38a' : '#8a6d3b'
    const halo = scheme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)'
    m.addSource('fields', { type: 'geojson', data: EMPTY })
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
    return () => {
      for (const id of ['fields', 'fields-labels']) if (m.getLayer(id)) m.removeLayer(id)
      if (m.getSource('fields')) m.removeSource('fields')
    }
  }, [scheme])

  useMapLayer(
    (m) => {
      const src = m.getSource('fields') as GeoJSONSource | undefined
      if (src) src.setData(geojson)
      if (m.getLayer('fields')) m.setPaintProperty('fields', 'line-opacity', opacity / 100)
      if (m.getLayer('fields-labels')) {
        m.setPaintProperty('fields-labels', 'text-opacity', opacity / 100)
      }
    },
    // scheme is a dep because the first effect rebuilds an empty source on toggle.
    [geojson, scheme, opacity],
  )

  return null
}
