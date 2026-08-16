import { useMemo } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { useMapLayer } from '@/map/useMapLayer'
import { addDataLayer } from '@/map/layerOrder'
import { cellSeverity, SEVERITY_COLORS } from '@/features/cells/service'
import { useVisibleCells } from '@/features/cells/useVisibleCells'

/** Storm cell markers: colored by severity, storm-id labels when zoomed. */
export function CellsLayer() {
  const { shown: cells } = useVisibleCells()

  const geojson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: cells.map((c) => ({
        type: 'Feature' as const,
        geometry: c.geometry,
        properties: {
          color: SEVERITY_COLORS[cellSeverity(c.properties)],
          severity: cellSeverity(c.properties),
          label: c.properties.storm_id,
          // Click-card fields: the raw attribute row for this cell.
          storm_id: c.properties.storm_id,
          nexrad: c.properties.nexrad,
          tvs: c.properties.tvs,
          meso: c.properties.meso,
          max_size: c.properties.max_size,
          posh: c.properties.posh,
          max_dbz: c.properties.max_dbz,
          top: c.properties.top,
          drct: c.properties.drct,
          sknt: c.properties.sknt,
          valid: c.properties.valid,
        },
      })),
    }),
    [cells],
  )

  useMapLayer(
    (map) => {
      map.addSource('cells', { type: 'geojson', data: geojson })
      addDataLayer(map, {
        id: 'cells',
        type: 'circle',
        source: 'cells',
        minzoom: 5,
        paint: {
          'circle-color': 'transparent',
          'circle-radius': ['+', 5, ['*', 2, ['get', 'severity']]],
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-width': 1.5,
        },
      }, 'cells')
      addDataLayer(map, {
        id: 'cells-label',
        type: 'symbol',
        source: 'cells',
        minzoom: 7,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 9,
          'text-offset': [0, 1.3],
          'text-font': ['Noto Sans Regular'],
        },
        paint: { 'text-color': ['get', 'color'] },
      }, 'cells')
      return () => {
        for (const id of ['cells', 'cells-label']) {
          if (map.getLayer(id)) map.removeLayer(id)
        }
        if (map.getSource('cells')) map.removeSource('cells')
      }
    },
    [],
  )

  useMapLayer(
    (map) => {
      const src = map.getSource('cells') as GeoJSONSource | undefined
      src?.setData(geojson)
    },
    [geojson],
  )

  return null
}
