import { useEffect, useState } from 'react'
import type { RasterTileSource } from 'maplibre-gl'
import { fetchJson } from '@/core/data/fetchJson'
import { startPoller } from '@/core/data/scheduler'
import { featureEnabled, useFeatureOption } from '@/core/settings/store'
import { useTimeline } from '@/core/time/timelineStore'
import { useMapLayer } from '@/map/useMapLayer'
import { addDataLayer } from '@/map/layerOrder'
import {
  RAINVIEWER,
  WEATHER_MAPS_URL,
  allFrames,
  pickFrame,
  tileUrlTemplate,
  type RainViewerMaps,
} from '@/features/radar/service'
import { iemValidTime, iemTileTemplate, CONUS } from '@/features/radar/iem'

const POLL_MS = 120_000

/** Global composite radar (RainViewer) + CONUS high-res (IEM), timeline-driven. */
export function RadarLayer() {
  const [maps, setMaps] = useState<RainViewerMaps | null>(null)
  const simTime = useTimeline((s) => s.simTime)
  const scheme = useFeatureOption<string>('radar', 'scheme')
  const smooth = useFeatureOption<boolean>('radar', 'smooth')
  const opacity = useFeatureOption<number>('radar', 'opacity')
  const conusEnabled = useFeatureOption<boolean>('radar', 'conus')

  useEffect(() => {
    return startPoller({
      source: RAINVIEWER,
      cadenceMs: POLL_MS,
      enabled: () => featureEnabled('radar'),
      run: async () => {
        setMaps(
          await fetchJson<RainViewerMaps>(RAINVIEWER, WEATHER_MAPS_URL, {
            fixture: 'rainviewer-maps',
          }),
        )
      },
    })
  }, [])

  const frame = maps ? pickFrame(allFrames(maps), simTime) : null
  const rvTiles = maps && frame ? tileUrlTemplate(maps, frame, scheme, smooth) : null
  const validMs = iemValidTime(simTime, Date.now())

  // RainViewer global composite
  useMapLayer(
    (map) => {
      if (!rvTiles) return
      map.addSource('radar-rv', {
        type: 'raster',
        tiles: [rvTiles],
        tileSize: 256,
        // RainViewer's composite stops at z7 — overzoom beyond instead of
        // requesting their "Zoom Level Not Supported" placeholder tiles.
        maxzoom: 7,
        attribution: 'Radar © RainViewer',
      })
      addDataLayer(
        map,
        {
          id: 'radar-rv',
          type: 'raster',
          source: 'radar-rv',
          paint: { 'raster-opacity': opacity / 100, 'raster-fade-duration': 150 },
        },
        'radar',
      )
      return () => {
        if (map.getLayer('radar-rv')) map.removeLayer('radar-rv')
        if (map.getSource('radar-rv')) map.removeSource('radar-rv')
      }
    },
    [rvTiles === null],
  )

  // Frame/opacity updates without source teardown
  useMapLayer(
    (map) => {
      const src = map.getSource('radar-rv') as RasterTileSource | undefined
      if (src && rvTiles) src.setTiles([rvTiles])
      if (map.getLayer('radar-rv')) map.setPaintProperty('radar-rv', 'raster-opacity', opacity / 100)
    },
    [rvTiles, opacity],
  )

  // IEM CONUS high-res overlay (bounds-limited so no off-CONUS requests)
  useMapLayer(
    (map) => {
      if (!conusEnabled || validMs === null) return
      map.addSource('radar-iem', {
        type: 'raster',
        tiles: [iemTileTemplate(validMs)],
        tileSize: 256,
        maxzoom: 12,
        bounds: [CONUS.lonMin, CONUS.latMin, CONUS.lonMax, CONUS.latMax],
        attribution: 'NEXRAD © Iowa Environmental Mesonet',
      })
      addDataLayer(
        map,
        {
          id: 'radar-iem',
          type: 'raster',
          source: 'radar-iem',
          paint: { 'raster-opacity': opacity / 100, 'raster-fade-duration': 150 },
        },
        'radar-conus',
      )
      return () => {
        if (map.getLayer('radar-iem')) map.removeLayer('radar-iem')
        if (map.getSource('radar-iem')) map.removeSource('radar-iem')
      }
    },
    [conusEnabled, validMs, opacity],
  )

  return null
}
