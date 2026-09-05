import { useEffect, useState } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { featureEnabled, useFeatureOption } from '@/core/settings/store'
import { startPoller } from '@/core/data/scheduler'
import { useMapLayer } from '@/map/useMapLayer'
import { addDataLayer } from '@/map/layerOrder'
import {
  GVP,
  ashGeoJSON,
  fetchVolcanoes,
  volcanoGeoJSON,
  type Volcano,
} from '@/features/volcanoes/service'
import {
  acquireAdvisoryFeed,
  acquireUsgsFeed,
  useAdvisories,
  useInspect,
  useUsgsNotices,
} from '@/features/volcanoes/store'
import { makeTriangleImage, triangleImageId } from '@/features/volcanoes/triangleIcons'
import type { VolcanoStatus } from '@/features/volcanoes/service'

/** The volcano list changes on academic timescales; status feeds don't. */
const LIST_POLL_MS = 6 * 3600_000

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
const STATUSES: VolcanoStatus[] = ['erupting', 'watch', 'advisory', 'quiet']

/** Triangles by status, ash advisory polygons observed + forecast. */
export function VolcanoesLayer() {
  const showAll = useFeatureOption<boolean>('volcanoes', 'showAll')
  const showAsh = useFeatureOption<boolean>('volcanoes', 'ash')
  const showForecast = useFeatureOption<boolean>('volcanoes', 'ashForecast')
  const [volcanoes, setVolcanoes] = useState<Volcano[]>([])
  const usgs = useUsgsNotices()
  const advisories = useAdvisories()
  const inspectQuakes = useInspect((s) => s.quakes)

  useEffect(() => acquireAdvisoryFeed(), [])
  useEffect(() => acquireUsgsFeed(), [])
  useEffect(
    () =>
      startPoller({
        source: GVP,
        cadenceMs: LIST_POLL_MS,
        enabled: () => featureEnabled('volcanoes'),
        run: async () => {
          setVolcanoes(await fetchVolcanoes())
        },
      }),
    [],
  )

  useMapLayer((m) => {
    for (const s of STATUSES) {
      if (!m.hasImage(triangleImageId(s))) {
        m.addImage(triangleImageId(s), makeTriangleImage(s), { pixelRatio: 2 })
      }
    }
    m.addSource('volcanoes', { type: 'geojson', data: EMPTY })
    m.addSource('volcano-ash', { type: 'geojson', data: EMPTY })
    m.addSource('volcano-quakes', { type: 'geojson', data: EMPTY })
    // Inspect-time seismicity: dots sized by magnitude while a card is open.
    addDataLayer(
      m,
      {
        id: 'volcano-quakes',
        type: 'circle',
        source: 'volcano-quakes',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['coalesce', ['get', 'mag'], 0],
            0, 2.5,
            2, 4.5,
            5, 10,
          ],
          'circle-color': '#f39c12',
          'circle-opacity': 0.8,
          'circle-stroke-color': 'rgba(0,0,0,0.6)',
          'circle-stroke-width': 1,
        },
      },
      'volcano-quakes',
    )
    // Ash: observed cloud as a wash + firm outline, forecasts dashed and
    // fading with lead time. Same source, filtered layers.
    addDataLayer(
      m,
      {
        id: 'volcano-ash-fill',
        type: 'fill',
        source: 'volcano-ash',
        filter: ['get', 'observed'],
        paint: { 'fill-color': '#5a5f66', 'fill-opacity': 0.22 },
      },
      'volcano-ash',
    )
    addDataLayer(
      m,
      {
        id: 'volcano-ash-outline',
        type: 'line',
        source: 'volcano-ash',
        filter: ['get', 'observed'],
        layout: { 'line-join': 'round' },
        paint: { 'line-color': '#c0392b', 'line-width': 1.8 },
      },
      'volcano-ash',
    )
    addDataLayer(
      m,
      {
        id: 'volcano-ash-forecast',
        type: 'line',
        source: 'volcano-ash',
        filter: ['!', ['get', 'observed']],
        layout: { 'line-join': 'round' },
        paint: {
          'line-color': '#c0392b',
          'line-width': 1.2,
          'line-dasharray': [4, 3],
          'line-opacity': ['get', 'fade'],
        },
      },
      'volcano-ash',
    )
    addDataLayer(
      m,
      {
        id: 'volcanoes',
        type: 'symbol',
        source: 'volcanoes',
        layout: {
          'icon-image': ['concat', 'volcano-', ['get', 'status']],
          'icon-size': ['interpolate', ['linear'], ['zoom'], 3, 0.7, 7, 1],
          'icon-allow-overlap': true,
          'symbol-sort-key': ['-', 3, ['get', 'rank']],
        },
      },
      'volcanoes',
    )
    addDataLayer(
      m,
      {
        id: 'volcano-labels',
        type: 'symbol',
        source: 'volcanoes',
        minzoom: 5,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 10,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#cdd3d9',
          'text-halo-color': 'rgba(0,0,0,0.75)',
          'text-halo-width': 1.1,
        },
      },
      'volcanoes',
    )
    return () => {
      for (const id of ['volcano-ash-fill', 'volcano-ash-outline', 'volcano-ash-forecast', 'volcano-quakes', 'volcanoes', 'volcano-labels']) {
        if (m.getLayer(id)) m.removeLayer(id)
      }
      for (const id of ['volcanoes', 'volcano-ash', 'volcano-quakes']) {
        if (m.getSource(id)) m.removeSource(id)
      }
      for (const s of STATUSES) {
        if (m.hasImage(triangleImageId(s))) m.removeImage(triangleImageId(s))
      }
    }
  }, [])

  useMapLayer(
    (m) => {
      const markers = m.getSource('volcanoes') as GeoJSONSource | undefined
      markers?.setData(volcanoGeoJSON(volcanoes, usgs, advisories, showAll))
      const ash = m.getSource('volcano-ash') as GeoJSONSource | undefined
      const geo = showAsh ? ashGeoJSON(advisories) : EMPTY
      ash?.setData(
        showForecast
          ? geo
          : { ...geo, features: geo.features.filter((f) => f.properties?.observed === true) },
      )
      const quakes = m.getSource('volcano-quakes') as GeoJSONSource | undefined
      quakes?.setData({
        type: 'FeatureCollection',
        features: inspectQuakes.map((q) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [q.lon, q.lat] },
          properties: { mag: q.mag },
        })),
      })
    },
    [volcanoes, usgs, advisories, showAll, showAsh, showForecast, inspectQuakes],
  )

  return null
}
