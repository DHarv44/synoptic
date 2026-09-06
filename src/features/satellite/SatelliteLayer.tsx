import { useEffect } from 'react'
import type { RasterTileSource } from 'maplibre-gl'
import { useFeatureOption } from '@/core/settings/store'
import { LOOP_FRAME_MS, loopFrames, useTimeline } from '@/core/time/timelineStore'
import { createWarmthReporter } from '@/core/time/warmth'
import { useMapContext } from '@/map/MapView'
import { useMapLayer } from '@/map/useMapLayer'
import { addDataLayer } from '@/map/layerOrder'
import { coveringTiles } from '@/map/tileMath'
import {
  gibsBounds,
  gibsMaxZoom,
  gibsTime,
  gibsTileTemplate,
  satelliteTimeMeta,
} from '@/features/satellite/service'
import { warmXyzFrames } from '@/features/satellite/prefetch'

/** Cross-fade between frames while paused; crisp while looping. */
const FADE_MS = 150

/** Quiet period after a view change before prefetching the loop. */
const SETTLE_MS = 500

/** NASA GIBS satellite imagery under the radar layers. */
export function SatelliteLayer() {
  const { map } = useMapContext()
  const simTime = useTimeline((s) => s.simTime)
  const playing = useTimeline((s) => s.playing)
  const product = useFeatureOption<string>('satellite', 'product')
  const opacity = useFeatureOption<number>('satellite', 'opacity')
  const tiles = gibsTileTemplate(product, gibsTime(product, simTime, Date.now()))

  // Warm the loop's frames for the current viewport, like the radar mosaic
  // does — without this the first pass through a satellite loop is a
  // slideshow of cold 10-minute frames. Daily products have one frame per
  // loop and nothing to warm.
  useEffect(() => {
    if (!playing || satelliteTimeMeta(product) === null) return
    const controller = new AbortController()
    const warmth = createWarmthReporter('satellite')
    const run = (): void => {
      const now = Date.now()
      const b = map.getBounds()
      const z = Math.max(0, Math.min(Math.floor(map.getZoom()), gibsMaxZoom(product)))
      // Clip to the product's footprint like the source does — warming
      // tiles GIBS will 404 wastes the whole sweep's request budget.
      const fp = gibsBounds(product) ?? [-180, -85, 180, 85]
      const cover = coveringTiles(
        Math.max(b.getWest(), fp[0]),
        Math.max(b.getSouth(), fp[1]),
        Math.min(b.getEast(), fp[2]),
        Math.min(b.getNorth(), fp[3]),
        z,
      )
      const urlsPerFrame = loopFrames(now).map((t) => {
        const tmpl = gibsTileTemplate(product, gibsTime(product, t, now))
        return cover.map((c) =>
          tmpl.replace('{z}', String(c.z)).replace('{y}', String(c.y)).replace('{x}', String(c.x)),
        )
      })
      warmth.report(0)
      void warmXyzFrames(urlsPerFrame, controller.signal, warmth.report)
    }
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
      warmth.dispose()
    }
  }, [playing, product, map])

  // Source lives as long as the product does. The sub-daily GOES frames step
  // every 10 minutes — with the timeline playing, rebuilding the source per
  // frame would throw away its tile cache exactly the way the radar mosaic
  // once did; setTiles swaps the URL and keeps it.
  useMapLayer(
    (map) => {
      map.addSource('satellite', {
        type: 'raster',
        tiles: [tiles],
        tileSize: 256,
        maxzoom: gibsMaxZoom(product),
        // Skip requests outside the product's footprint — GIBS 404s them.
        ...(gibsBounds(product) ? { bounds: gibsBounds(product) } : {}),
        attribution: 'Imagery © NASA GIBS',
      })
      addDataLayer(
        map,
        {
          id: 'satellite',
          type: 'raster',
          source: 'satellite',
          paint: { 'raster-opacity': opacity / 100, 'raster-fade-duration': FADE_MS },
        },
        'satellite',
      )
      return () => {
        if (map.getLayer('satellite')) map.removeLayer('satellite')
        if (map.getSource('satellite')) map.removeSource('satellite')
      }
    },
    [product],
  )

  useMapLayer(
    (map) => {
      const src = map.getSource('satellite') as RasterTileSource | undefined
      if (src) src.setTiles([tiles])
      if (map.getLayer('satellite')) {
        map.setPaintProperty('satellite', 'raster-opacity', opacity / 100)
        // A cross-fade at loop speed leaves two frames dissolving into each
        // other for most of each dwell, smearing the very motion the loop
        // exists to show — crisp cuts while playing, fade at rest.
        map.setPaintProperty('satellite', 'raster-fade-duration', playing ? 0 : FADE_MS)
      }
    },
    [tiles, opacity, playing],
  )

  return null
}
