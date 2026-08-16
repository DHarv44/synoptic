import { useMemo } from 'react'
import { useFeatureOption } from '@/core/settings/store'
import { useMapLayer } from '@/map/useMapLayer'
import { addDataLayer } from '@/map/layerOrder'

function graticuleGeojson(spacing: number): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []
  for (let lat = -80; lat <= 80; lat += spacing) {
    const coords: [number, number][] = []
    for (let lon = -180; lon <= 180; lon += 2) coords.push([lon, lat])
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: {},
    })
  }
  for (let lon = -180; lon < 180; lon += spacing) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [lon, -85],
          [lon, 85],
        ],
      },
      properties: {},
    })
  }
  return { type: 'FeatureCollection', features }
}

/** Lat/lon grid lines over the basemap. */
export function GraticuleLayer() {
  const spacing = Number(useFeatureOption<string>('graticule', 'spacing'))
  const opacity = useFeatureOption<number>('graticule', 'opacity')
  const data = useMemo(() => graticuleGeojson(spacing), [spacing])

  useMapLayer(
    (map) => {
      map.addSource('graticule', { type: 'geojson', data })
      addDataLayer(
        map,
        {
          id: 'graticule',
          type: 'line',
          source: 'graticule',
          paint: {
            'line-color': '#748496',
            'line-opacity': opacity / 100,
            'line-width': 0.75,
          },
        },
        'graticule',
      )
      return () => {
        if (map.getLayer('graticule')) map.removeLayer('graticule')
        if (map.getSource('graticule')) map.removeSource('graticule')
      }
    },
    [data],
  )

  useMapLayer(
    (map) => {
      if (map.getLayer('graticule')) {
        map.setPaintProperty('graticule', 'line-opacity', opacity / 100)
      }
    },
    [opacity],
  )

  return null
}
