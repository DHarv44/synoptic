import { useEffect, useState } from 'react'
import type { RasterTileSource } from 'maplibre-gl'
import { fetchJson } from '@/core/data/fetchJson'
import { startPoller } from '@/core/data/scheduler'
import { featureEnabled, useFeatureOption } from '@/core/settings/store'
import { useTimeline } from '@/core/time/timelineStore'
import { useMapLayer } from '@/map/useMapLayer'
import { useMapView } from '@/map/viewStore'
import { addDataLayer } from '@/map/layerOrder'
import {
  RAINVIEWER,
  WEATHER_MAPS_URL,
  allFrames,
  pickFrame,
  tileUrlTemplate,
  type RainViewerMaps,
} from '@/features/radar/service'
import { boundsInsideConus, iemProduct, iemTileTemplate, CONUS } from '@/features/radar/iem'

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

  const bounds = useMapView((s) => s.bounds)
  const frame = maps ? pickFrame(allFrames(maps), simTime) : null
  const rvTiles = maps && frame ? tileUrlTemplate(maps, frame, scheme, smooth) : null
  const product = iemProduct(simTime, Date.now())
  /**
   * The two composites are different products at different valid times, so
   * they place the same storm several kilometres apart. Stacked, whichever
   * finished loading wins — which is why the echo appeared to jump when a
   * new zoom level's mosaic tiles arrived. Draw only one: the sharper
   * mosaic wherever it fully covers the view, the global composite
   * everywhere else.
   */
  const mosaicCovers = conusEnabled && product !== null && boundsInsideConus(bounds)

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
          paint: {
            'raster-opacity': opacity / 100,
            'raster-fade-duration': 150,
            'raster-resampling': smooth ? 'linear' : 'nearest',
          },
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
      if (map.getLayer('radar-rv')) {
        map.setLayoutProperty('radar-rv', 'visibility', mosaicCovers ? 'none' : 'visible')
      }
      const resampling = smooth ? 'linear' : 'nearest'
      for (const id of ['radar-rv', 'radar-iem']) {
        if (!map.getLayer(id)) continue
        map.setPaintProperty(id, 'raster-opacity', opacity / 100)
        map.setPaintProperty(id, 'raster-resampling', resampling)
      }
    },
    [rvTiles, opacity, smooth, mosaicCovers],
  )

  // IEM CONUS high-res overlay (bounds-limited so no off-CONUS requests)
  useMapLayer(
    (map) => {
      if (!conusEnabled || product === null) return
      map.addSource('radar-iem', {
        type: 'raster',
        tiles: [iemTileTemplate(product)],
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
          paint: {
            'raster-opacity': opacity / 100,
            'raster-fade-duration': 150,
            'raster-resampling': smooth ? 'linear' : 'nearest',
          },
        },
        'radar-conus',
      )
      return () => {
        if (map.getLayer('radar-iem')) map.removeLayer('radar-iem')
        if (map.getSource('radar-iem')) map.removeSource('radar-iem')
      }
    },
    [conusEnabled, product, opacity, smooth],
  )

  return null
}
