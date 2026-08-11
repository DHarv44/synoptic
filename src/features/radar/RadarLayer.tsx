import { useEffect, useState } from 'react'
import type { ExpressionSpecification, RasterTileSource } from 'maplibre-gl'
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

/** Tile ceilings: past these the source has no more detail to give. */
const RV_MAXZOOM = 7
const IEM_MAXZOOM = 12

const POLL_MS = 120_000

/**
 * Below a source's maxzoom every zoom step fetches genuinely finer tiles, so
 * nearest-neighbour is right: it shows the data as measured. Above it there
 * is no more data — the same image is just magnified — and nearest turns
 * that into hard blocks that snap into view the moment the ceiling is
 * crossed, which reads as the radar abruptly changing. Interpolate past the
 * ceiling so it softens instead. `smooth` forces it on everywhere.
 */
function resampling(maxzoom: number, smooth: boolean): ExpressionSpecification | 'linear' {
  if (smooth) return 'linear'
  return ['step', ['zoom'], 'nearest', maxzoom, 'linear']
}

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
   * Exactly one composite is ever drawn. They are different products at
   * different valid times, and the mosaic's "no echo" is transparent, so
   * stacking them does not overlay — it *blends*: mosaic where it has echo,
   * global composite where it doesn't. The blend changes as soon as either
   * layer's coverage does, which is why the picture reorganised itself when
   * zooming out past the point where the mosaic stops covering the view.
   *
   * So: the sharper mosaic while it fully covers the viewport, the global
   * composite otherwise. At wide zoom the mosaic's extra resolution is
   * invisible anyway, and one consistent picture beats a seam.
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
        maxzoom: RV_MAXZOOM,
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
            'raster-resampling': resampling(RV_MAXZOOM, smooth),
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
      if (map.getLayer('radar-iem')) {
        map.setLayoutProperty('radar-iem', 'visibility', mosaicCovers ? 'visible' : 'none')
      }
      for (const [id, maxzoom] of [
        ['radar-rv', RV_MAXZOOM],
        ['radar-iem', IEM_MAXZOOM],
      ] as const) {
        if (!map.getLayer(id)) continue
        map.setPaintProperty(id, 'raster-opacity', opacity / 100)
        map.setPaintProperty(id, 'raster-resampling', resampling(maxzoom, smooth))
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
        maxzoom: IEM_MAXZOOM,
        bounds: [CONUS.lonMin, CONUS.latMin, CONUS.lonMax, CONUS.latMax],
        attribution: 'NEXRAD © Iowa Environmental Mesonet',
      })
      addDataLayer(
        map,
        {
          id: 'radar-iem',
          type: 'raster',
          source: 'radar-iem',
          layout: { visibility: mosaicCovers ? 'visible' : 'none' },
          paint: {
            'raster-opacity': opacity / 100,
            'raster-fade-duration': 150,
            'raster-resampling': resampling(IEM_MAXZOOM, smooth),
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
