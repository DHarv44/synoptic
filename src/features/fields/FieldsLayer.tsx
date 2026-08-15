import { useEffect, useState } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { useFeatureOption } from '@/core/settings/store'
import { fetchGridField } from '@/core/data/gfsGrid'
import { useMapLayer } from '@/map/useMapLayer'
import { addDataLayer } from '@/map/layerOrder'
import { FIELD_SPECS, fieldGeoJSON } from '@/features/fields/service'

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

/**
 * Contoured GFS analysis fields — isobars and friends. Monochrome by
 * convention: these are reference lines the coloured data layers sit over,
 * the way they do on every synoptic chart since the telegraph.
 */
export function FieldsLayer() {
  const field = useFeatureOption<string>('fields', 'field')
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
    m.addSource('fields', { type: 'geojson', data: EMPTY })
    addDataLayer(
      m,
      {
        id: 'fields',
        type: 'line',
        source: 'fields',
        layout: { 'line-join': 'round' },
        paint: {
          'line-color': '#9aa4ad',
          'line-width': 1,
          'line-opacity': 0.75,
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
          'text-field': ['get', 'label'],
          'text-size': 10,
          'text-font': ['Noto Sans Regular'],
          'text-padding': 8,
        },
        paint: {
          'text-color': '#c3ccd4',
          'text-halo-color': 'rgba(0,0,0,0.75)',
          'text-halo-width': 1.2,
        },
      },
      'fields',
    )
    return () => {
      for (const id of ['fields', 'fields-labels']) if (m.getLayer(id)) m.removeLayer(id)
      if (m.getSource('fields')) m.removeSource('fields')
    }
  }, [])

  useMapLayer(
    (m) => {
      const src = m.getSource('fields') as GeoJSONSource | undefined
      if (src) src.setData(geojson)
    },
    [geojson],
  )

  return null
}
