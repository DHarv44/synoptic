import { useEffect, useMemo } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { firstSymbolLayerId, useMapLayer } from '@/map/useMapLayer'
import { alertColor, withGeometry } from '@/features/alerts/service'
import { acquireAlertsFeed, useAlertsData } from '@/features/alerts/store'

/** Warning polygons: translucent fill + colored outline (GeoJSON layers). */
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
        },
      })),
    }),
    [alerts],
  )

  useMapLayer(
    (map) => {
      map.addSource('alerts', { type: 'geojson', data: geojson })
      const beforeId = firstSymbolLayerId(map)
      map.addLayer(
        {
          id: 'alerts-fill',
          type: 'fill',
          source: 'alerts',
          paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.08 },
        },
        beforeId,
      )
      map.addLayer(
        {
          id: 'alerts-line',
          type: 'line',
          source: 'alerts',
          paint: { 'line-color': ['get', 'color'], 'line-width': 1.5 },
        },
        beforeId,
      )
      return () => {
        for (const id of ['alerts-fill', 'alerts-line']) {
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
