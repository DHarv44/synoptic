import { useEffect, useMemo } from 'react'
import type { ExpressionSpecification, GeoJSONSource } from 'maplibre-gl'
import { useMapLayer } from '@/map/useMapLayer'
import { addDataLayer } from '@/map/layerOrder'
import { alertColor, alertWeight, withGeometry } from '@/features/alerts/service'
import { acquireAlertsFeed, useAlertsData } from '@/features/alerts/store'

/**
 * Zoom-interpolated outline width, scaled by the per-event weight and
 * padded for the casing. The scaling has to happen inside the interpolate
 * outputs: MapLibre only accepts `zoom` as the direct input of a top-level
 * interpolate/step, so wrapping one in arithmetic is rejected outright.
 */
function strokeWidth(pad = 0): ExpressionSpecification {
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    4,
    ['+', ['*', ['get', 'weight'], 1.6], pad],
    10,
    ['+', ['*', ['get', 'weight'], 3], pad],
  ]
}

/**
 * Warning polygons: a translucent wash above the radar, and an outline above
 * everything. The outline carries a dark casing so it holds its edge over
 * both bright echo and pale terrain — a warning boundary that disappears
 * into a red storm core is worse than no boundary at all.
 */
export function AlertsLayer() {
  const alerts = useAlertsData()
  useEffect(() => acquireAlertsFeed(), [])

  const geojson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: withGeometry(alerts).map((a) => ({
        type: 'Feature' as const,
        geometry: a.geometry as GeoJSON.Geometry,
        properties: {
          color: alertColor(a.properties.event),
          event: a.properties.event,
          weight: alertWeight(a.properties.event),
        },
      })),
    }),
    [alerts],
  )

  useMapLayer(
    (map) => {
      map.addSource('alerts', { type: 'geojson', data: geojson })
      addDataLayer(
        map,
        {
          id: 'alerts-fill',
          type: 'fill',
          source: 'alerts',
          paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.14 },
        },
        'alerts-fill',
      )
      addDataLayer(
        map,
        {
          id: 'alerts-casing',
          type: 'line',
          source: 'alerts',
          layout: { 'line-join': 'round' },
          paint: {
            'line-color': '#000000',
            'line-opacity': 0.45,
            'line-width': strokeWidth(2.5),
          },
        },
        'alerts-outline',
      )
      addDataLayer(
        map,
        {
          id: 'alerts-line',
          type: 'line',
          source: 'alerts',
          layout: { 'line-join': 'round' },
          paint: {
            'line-color': ['get', 'color'],
            'line-width': strokeWidth(),
          },
        },
        'alerts-outline',
      )
      return () => {
        for (const id of ['alerts-fill', 'alerts-casing', 'alerts-line']) {
          if (map.getLayer(id)) map.removeLayer(id)
        }
        if (map.getSource('alerts')) map.removeSource('alerts')
      }
    },
    [],
  )

  useMapLayer(
    (map) => {
      const src = map.getSource('alerts') as GeoJSONSource | undefined
      src?.setData(geojson)
    },
    [geojson],
  )

  return null
}
