import { useEffect, useMemo, useState } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { fetchJson } from '@/core/data/fetchJson'
import { featureEnabled, useFeatureOption } from '@/core/settings/store'
import { MAP_COLORS } from '@/core/mapColors'
import { startPoller } from '@/core/data/scheduler'
import { useMapLayer } from '@/map/useMapLayer'
import { addDataLayer } from '@/map/layerOrder'
import {
  SPC,
  outlookUrl,
  unexpired,
  watchColor,
  type OutlookProps,
  type SpcCollection,
} from '@/features/spc/service'
import { acquireMcdFeed, acquireWatchFeed, useMcds, useWatches } from '@/features/spc/store'

const OUTLOOK_POLL_MS = 10 * 60_000

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

/**
 * SPC on the map: categorical outlook fills at the very bottom of the data
 * stack (context everything else sits on), watch parallelograms and MCD
 * outlines up with the warning boundaries where a box that means "the next
 * two hours matter" cannot be buried.
 */
export function SpcLayer() {
  const day = useFeatureOption<string>('spc', 'day')
  const showWatches = useFeatureOption<boolean>('spc', 'watches')
  const showMcds = useFeatureOption<boolean>('spc', 'mcds')

  const [outlook, setOutlook] = useState<SpcCollection<OutlookProps> | null>(null)
  useEffect(() => {
    return startPoller({
      source: SPC,
      cadenceMs: OUTLOOK_POLL_MS,
      enabled: () => featureEnabled('spc'),
      run: async () => {
        setOutlook(
          await fetchJson<SpcCollection<OutlookProps>>(SPC, outlookUrl(day), {
            fixture: 'spc-outlook',
          }),
        )
      },
    })
  }, [day])

  useEffect(() => acquireMcdFeed(), [])
  useEffect(() => acquireWatchFeed(), [])
  const mcds = useMcds()
  const watches = useWatches()

  // The watch endpoint serves only watches in effect; no expiry filter here.
  const watchGeo = useMemo(
    () =>
      showWatches
        ? {
            type: 'FeatureCollection' as const,
            features: watches.map((w) => ({
              ...w,
              properties: { ...w.properties, color: watchColor(w.properties.type) },
            })),
          }
        : EMPTY,
    [watches, showWatches],
  )
  const mcdGeo = useMemo(
    () =>
      showMcds
        ? { type: 'FeatureCollection' as const, features: unexpired(mcds, Date.now()) }
        : EMPTY,
    [mcds, showMcds],
  )

  useMapLayer((m) => {
    m.addSource('spc-outlook', { type: 'geojson', data: EMPTY })
    m.addSource('spc-watches', { type: 'geojson', data: EMPTY })
    m.addSource('spc-mcds', { type: 'geojson', data: EMPTY })
    addDataLayer(
      m,
      {
        id: 'spc-outlook',
        type: 'fill',
        source: 'spc-outlook',
        paint: {
          'fill-color': ['get', 'fill'],
          // A categorical outlook is context at synoptic zoom and mud over
          // radar at storm scale; the wash bows out as you close in and
          // the outline layer carries the boundary alone.
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 5.5, 0.22, 7, 0.06, 8, 0],
        },
      },
      'spc-outlook',
    )
    addDataLayer(
      m,
      {
        id: 'spc-outlook-line',
        type: 'line',
        source: 'spc-outlook',
        paint: { 'line-color': ['get', 'stroke'], 'line-width': 1.5 },
      },
      'spc-outlook',
    )
    addDataLayer(
      m,
      {
        id: 'spc-watches',
        type: 'line',
        source: 'spc-watches',
        layout: { 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          // A Particularly Dangerous Situation earns the heavier line.
          'line-width': ['case', ['get', 'is_pds'], 4, 2.5],
          'line-dasharray': [5, 2],
        },
      },
      'alerts-outline',
    )
    addDataLayer(
      m,
      {
        id: 'spc-mcds',
        type: 'line',
        source: 'spc-mcds',
        paint: {
          'line-color': MAP_COLORS.orange7,
          'line-width': 1.6,
          'line-dasharray': [2, 2],
        },
      },
      'alerts-outline',
    )
    return () => {
      for (const id of ['spc-outlook', 'spc-outlook-line', 'spc-watches', 'spc-mcds']) {
        if (m.getLayer(id)) m.removeLayer(id)
      }
      for (const id of ['spc-outlook', 'spc-watches', 'spc-mcds']) {
        if (m.getSource(id)) m.removeSource(id)
      }
    }
  }, [])

  useMapLayer(
    (m) => {
      const o = m.getSource('spc-outlook') as GeoJSONSource | undefined
      if (o) o.setData(outlook ?? EMPTY)
      const w = m.getSource('spc-watches') as GeoJSONSource | undefined
      if (w) w.setData(watchGeo)
      const d = m.getSource('spc-mcds') as GeoJSONSource | undefined
      if (d) d.setData(mcdGeo)
    },
    [outlook, watchGeo, mcdGeo],
  )

  return null
}
