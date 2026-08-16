import { useEffect, useMemo, useState } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { fetchJson } from '@/core/data/fetchJson'
import { featureEnabled, useFeatureOption } from '@/core/settings/store'
import { startPoller } from '@/core/data/scheduler'
import { useMapContext } from '@/map/MapView'
import { useMapLayer } from '@/map/useMapLayer'
import { addDataLayer } from '@/map/layerOrder'
import {
  AWC,
  activeSigmets,
  pirepGeoJSON,
  pirepUrl,
  sigmetGeoJSON,
  type Pirep,
} from '@/features/aviation/service'
import { acquireSigmetFeed, useSigmetData } from '@/features/aviation/store'

/** Below this, PIREPs are national noise rather than local information. */
const PIREP_MIN_ZOOM = 4
const PIREP_POLL_MS = 5 * 60_000

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

/** SIGMET polygons under the warning wash; PIREP dots above the labels. */
export function AviationLayer() {
  const { map } = useMapContext()
  const showSigmets = useFeatureOption<boolean>('aviation', 'sigmets')
  const showPireps = useFeatureOption<boolean>('aviation', 'pireps')

  useEffect(() => acquireSigmetFeed(), [])
  const sigmets = useSigmetData()
  const sigmetGeo = useMemo(
    () => (showSigmets ? sigmetGeoJSON(activeSigmets(sigmets, Date.now())) : EMPTY),
    [sigmets, showSigmets],
  )

  // PIREPs mirror the METAR viewport pattern: quantized centre key so
  // panning inside a cell doesn't refetch, null key below the zoom floor.
  const [pireps, setPireps] = useState<Pirep[]>([])
  const [bboxKey, setBboxKey] = useState<string | null>(null)
  useEffect(() => {
    const update = (): void => {
      if (!showPireps || map.getZoom() < PIREP_MIN_ZOOM - 0.5) {
        setBboxKey(null)
        return
      }
      const c = map.getCenter()
      setBboxKey(`${Math.round(c.lat / 4) * 4},${Math.round(c.lng / 4) * 4}`)
    }
    update()
    map.on('moveend', update)
    return () => {
      map.off('moveend', update)
    }
  }, [map, showPireps])

  useEffect(() => {
    if (bboxKey === null) {
      setPireps([])
      return
    }
    const [latC, lonC] = bboxKey.split(',').map(Number)
    return startPoller({
      source: AWC,
      cadenceMs: PIREP_POLL_MS,
      enabled: () => featureEnabled('aviation'),
      run: async () => {
        setPireps(
          await fetchJson<Pirep[]>(AWC, pirepUrl(latC - 8, lonC - 11, latC + 8, lonC + 11), {
            fixture: 'awc-pirep',
          }),
        )
      },
    })
  }, [bboxKey])

  useMapLayer((m) => {
    m.addSource('aviation-sigmets', { type: 'geojson', data: EMPTY })
    m.addSource('aviation-pireps', { type: 'geojson', data: EMPTY })
    addDataLayer(
      m,
      {
        id: 'aviation-fill',
        type: 'fill',
        source: 'aviation-sigmets',
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.08 },
      },
      'aviation-fill',
    )
    addDataLayer(
      m,
      {
        id: 'aviation-outline',
        type: 'line',
        source: 'aviation-sigmets',
        layout: { 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1.6,
          'line-dasharray': [3, 2],
        },
      },
      'aviation-fill',
    )
    // The hazard name on the polygon, the way the GFA labels its areas —
    // an unlabeled wash makes the reader open a panel to learn "TURB".
    addDataLayer(
      m,
      {
        id: 'aviation-sigmet-labels',
        type: 'symbol',
        source: 'aviation-sigmets',
        layout: {
          'text-field': ['get', 'hazard'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 11,
        },
        paint: {
          'text-color': ['get', 'color'],
          'text-halo-color': 'rgba(0,0,0,0.7)',
          'text-halo-width': 1.2,
        },
      },
      'aviation-fill',
    )
    addDataLayer(
      m,
      {
        id: 'pirep',
        type: 'circle',
        source: 'aviation-pireps',
        minzoom: PIREP_MIN_ZOOM,
        paint: {
          'circle-radius': ['+', 2.5, ['get', 'sev']],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.85,
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(0,0,0,0.5)',
        },
      },
      'pirep',
    )
    return () => {
      for (const id of ['aviation-fill', 'aviation-outline', 'aviation-sigmet-labels', 'pirep']) {
        if (m.getLayer(id)) m.removeLayer(id)
      }
      for (const id of ['aviation-sigmets', 'aviation-pireps']) {
        if (m.getSource(id)) m.removeSource(id)
      }
    }
  }, [])

  useMapLayer(
    (m) => {
      const sig = m.getSource('aviation-sigmets') as GeoJSONSource | undefined
      if (sig) sig.setData(sigmetGeo)
      const pir = m.getSource('aviation-pireps') as GeoJSONSource | undefined
      if (pir) pir.setData(showPireps ? pirepGeoJSON(pireps) : EMPTY)
    },
    [sigmetGeo, pireps, showPireps],
  )

  return null
}
