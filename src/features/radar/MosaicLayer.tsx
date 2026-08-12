import { useEffect } from 'react'
import type { RasterTileSource } from 'maplibre-gl'
import { useFeatureOption } from '@/core/settings/store'
import { LOOP_FRAME_MS, loopFrames, useTimeline } from '@/core/time/timelineStore'
import { useMapContext } from '@/map/MapView'
import { useMapLayer } from '@/map/useMapLayer'
import { addDataLayer } from '@/map/layerOrder'
import { iemValidTime, iemTileTemplate, CONUS } from '@/features/radar/iem'
import { mosaicUrl, registerMosaicProtocol } from '@/features/radar/mosaic/protocol'
import { prefetchFrames } from '@/features/radar/mosaic/prefetch'

/** Past this the mosaic has no more detail; MapLibre overzooms instead. */
const MAXZOOM = 12

/** Cross-fade between frames while paused; crisp while looping. */
const FADE_MS = 150

/** Quiet period after a view change before prefetching the loop. */
const SETTLE_MS = 500

/**
 * US NEXRAD reflectivity mosaic, drawn in our own colours.
 *
 * Tiles arrive as IEM's rendering and are translated back to values and
 * recoloured before MapLibre ever sees them, so this layer and the Level 2
 * sweep share one colour table and one display floor. That is what makes
 * zooming from the mosaic into a single site read as detail resolving rather
 * than as a different product taking over.
 */
export function MosaicLayer() {
  const { map } = useMapContext()
  const simTime = useTimeline((s) => s.simTime)
  const playing = useTimeline((s) => s.playing)
  const opacity = useFeatureOption<number>('radar', 'opacity')
  const floorDbz = useFeatureOption<number>('radar', 'floor')

  registerMosaicProtocol()
  const tiles = mosaicUrl(iemTileTemplate(iemValidTime(simTime, Date.now())), floorDbz)

  // Warm every frame in the loop. Cold tiles take ~800 ms and cached ones
  // ~7 ms, so without this the first pass is a slideshow and every later one
  // is smooth — the kind of inconsistency that reads as the app being broken.
  useEffect(() => {
    if (!playing) return
    const controller = new AbortController()
    const { setWarmFrames } = useTimeline.getState()
    const run = (): void => {
      const now = Date.now()
      const urls = loopFrames(now).map((t) => iemTileTemplate(iemValidTime(t, now)))
      // A new sweep re-warms from the oldest frame, so what was ready for the
      // previous viewport says nothing about this one.
      setWarmFrames(0)
      void prefetchFrames(
        (bbox, i) => urls[i].replace('{bbox-epsg-3857}', bbox),
        urls.length,
        controller.signal,
        setWarmFrames,
      )
    }
    // Debounced, and deliberately not immediate: every sweep is multiplied by
    // the frame count, and a zoom emits several moveends while tiles for the
    // old view are still recorded. Waiting lets the viewport settle first.
    let pending = 0
    const schedule = (): void => {
      clearTimeout(pending)
      pending = window.setTimeout(run, SETTLE_MS)
    }
    schedule()
    map.on('moveend', schedule)
    const id = setInterval(schedule, LOOP_FRAME_MS)
    return () => {
      controller.abort()
      clearTimeout(pending)
      map.off('moveend', schedule)
      clearInterval(id)
      // No sweep, no reporter — the loop must not wait on us.
      setWarmFrames(null)
    }
  }, [playing, map])

  useMapLayer(
    (map) => {
      map.addSource('radar-mosaic', {
        type: 'raster',
        tiles: [tiles],
        tileSize: 256,
        maxzoom: MAXZOOM,
        bounds: [CONUS.lonMin, CONUS.latMin, CONUS.lonMax, CONUS.latMax],
        attribution: 'NEXRAD © Iowa Environmental Mesonet',
      })
      addDataLayer(
        map,
        {
          id: 'radar-mosaic',
          type: 'raster',
          source: 'radar-mosaic',
          paint: { 'raster-opacity': opacity / 100, 'raster-fade-duration': 150 },
        },
        'radar',
      )
      return () => {
        if (map.getLayer('radar-mosaic')) map.removeLayer('radar-mosaic')
        if (map.getSource('radar-mosaic')) map.removeSource('radar-mosaic')
      }
    },
    // Built once per style. The valid time and floor live in the tile URL and
    // change on every loop frame, so rebuilding the source for them would
    // throw away its tile cache several times a second while playing.
    [],
  )

  useMapLayer(
    (map) => {
      const src = map.getSource('radar-mosaic') as RasterTileSource | undefined
      if (src) src.setTiles([tiles])
      if (map.getLayer('radar-mosaic')) {
        map.setPaintProperty('radar-mosaic', 'raster-opacity', opacity / 100)
        // A 150 ms cross-fade at 175 ms per frame would leave two frames
        // dissolving into each other for most of the loop, which smears
        // exactly the motion the loop exists to show.
        map.setPaintProperty('radar-mosaic', 'raster-fade-duration', playing ? 0 : FADE_MS)
      }
    },
    [tiles, opacity, playing],
  )

  return null
}
