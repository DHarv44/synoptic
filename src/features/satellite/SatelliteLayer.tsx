import type { RasterTileSource } from 'maplibre-gl'
import { useFeatureOption } from '@/core/settings/store'
import { useTimeline } from '@/core/time/timelineStore'
import { useMapLayer } from '@/map/useMapLayer'
import { addDataLayer } from '@/map/layerOrder'
import { gibsMaxZoom, gibsTime, gibsTileTemplate } from '@/features/satellite/service'

/** NASA GIBS satellite imagery under the radar layers. */
export function SatelliteLayer() {
  const simTime = useTimeline((s) => s.simTime)
  const product = useFeatureOption<string>('satellite', 'product')
  const opacity = useFeatureOption<number>('satellite', 'opacity')
  const tiles = gibsTileTemplate(product, gibsTime(product, simTime, Date.now()))

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
        attribution: 'Imagery © NASA GIBS',
      })
      addDataLayer(
        map,
        {
          id: 'satellite',
          type: 'raster',
          source: 'satellite',
          paint: { 'raster-opacity': opacity / 100, 'raster-fade-duration': 150 },
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
      }
    },
    [tiles, opacity],
  )

  return null
}
