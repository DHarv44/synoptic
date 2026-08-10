import { useFeatureOption } from '@/core/settings/store'
import { useTimeline } from '@/core/time/timelineStore'
import { firstSymbolLayerId, useMapLayer } from '@/map/useMapLayer'
import { gibsDate, gibsTileTemplate, PRODUCTS } from '@/features/satellite/service'

/** NASA GIBS satellite imagery under the radar layers. */
export function SatelliteLayer() {
  const simTime = useTimeline((s) => s.simTime)
  const product = useFeatureOption<string>('satellite', 'product')
  const opacity = useFeatureOption<number>('satellite', 'opacity')
  const date = gibsDate(simTime, Date.now())

  useMapLayer(
    (map) => {
      const p = PRODUCTS[product] ?? PRODUCTS.truecolor
      map.addSource('satellite', {
        type: 'raster',
        tiles: [gibsTileTemplate(product, date)],
        tileSize: 256,
        maxzoom: p.maxZoom,
        attribution: 'Imagery © NASA GIBS',
      })
      // Below the radar layers if present, else below basemap labels.
      const beforeId = map.getLayer('radar-rv') ? 'radar-rv' : firstSymbolLayerId(map)
      map.addLayer(
        {
          id: 'satellite',
          type: 'raster',
          source: 'satellite',
          paint: { 'raster-opacity': opacity / 100, 'raster-fade-duration': 150 },
        },
        beforeId,
      )
      return () => {
        if (map.getLayer('satellite')) map.removeLayer('satellite')
        if (map.getSource('satellite')) map.removeSource('satellite')
      }
    },
    [product, date, opacity],
  )

  return null
}
