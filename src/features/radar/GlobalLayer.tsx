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

/** RainViewer's composite stops here; past it MapLibre overzooms. */
const MAXZOOM = 7

const POLL_MS = 120_000

/**
 * Worldwide composite radar. Coarser than the US mosaic and pre-coloured by
 * the source, so its colour table is RainViewer's rather than ours — the
 * trade for coverage outside NEXRAD.
 */
export function GlobalLayer() {
  const [maps, setMaps] = useState<RainViewerMaps | null>(null)
  const simTime = useTimeline((s) => s.simTime)
  const scheme = useFeatureOption<string>('radar', 'scheme')
  const smooth = useFeatureOption<boolean>('radar', 'smooth')
  const opacity = useFeatureOption<number>('radar', 'opacity')

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
  const tiles = maps && frame ? tileUrlTemplate(maps, frame, scheme, smooth) : null

  useMapLayer(
    (map) => {
      if (!tiles) return
      map.addSource('radar-global', {
        type: 'raster',
        tiles: [tiles],
        tileSize: 256,
        maxzoom: MAXZOOM,
        attribution: 'Radar © RainViewer',
      })
      addDataLayer(
        map,
        {
          id: 'radar-global',
          type: 'raster',
          source: 'radar-global',
          paint: { 'raster-opacity': opacity / 100, 'raster-fade-duration': 150 },
        },
        'radar',
      )
      return () => {
        if (map.getLayer('radar-global')) map.removeLayer('radar-global')
        if (map.getSource('radar-global')) map.removeSource('radar-global')
      }
    },
    [tiles === null],
  )

  // Frames advance often; swapping the URLs beats tearing the source down.
  useMapLayer(
    (map) => {
      const src = map.getSource('radar-global') as RasterTileSource | undefined
      if (src && tiles) src.setTiles([tiles])
      if (map.getLayer('radar-global')) {
        map.setPaintProperty('radar-global', 'raster-opacity', opacity / 100)
      }
    },
    [tiles, opacity],
  )

  return null
}
