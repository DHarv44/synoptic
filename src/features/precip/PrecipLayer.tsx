import type { RasterTileSource } from 'maplibre-gl'
import { useFeatureOption } from '@/core/settings/store'
import { useMapLayer } from '@/map/useMapLayer'
import { addDataLayer } from '@/map/layerOrder'
import { precipTileTemplate } from '@/features/precip/service'

/**
 * MRMS accumulated precipitation under the radar: how much has fallen,
 * beside the mosaic's how hard it is falling. The rolling accumulations
 * turn over gently, so live (unpinned) tiles carry none of the per-zoom
 * generation skew that forced the reflectivity mosaic onto pinned TIME.
 */
export function PrecipLayer() {
  const product = useFeatureOption<string>('precip', 'product')
  const opacity = useFeatureOption<number>('precip', 'opacity')
  const tiles = precipTileTemplate(product)

  useMapLayer((map) => {
    map.addSource('precip', {
      type: 'raster',
      tiles: [tiles],
      tileSize: 256,
      attribution: 'MRMS © Iowa Environmental Mesonet',
    })
    addDataLayer(
      map,
      {
        id: 'precip',
        type: 'raster',
        source: 'precip',
        paint: { 'raster-opacity': opacity / 100, 'raster-fade-duration': 150 },
      },
      'precip',
    )
    return () => {
      if (map.getLayer('precip')) map.removeLayer('precip')
      if (map.getSource('precip')) map.removeSource('precip')
    }
  }, [])

  useMapLayer(
    (map) => {
      const src = map.getSource('precip') as RasterTileSource | undefined
      if (src) src.setTiles([tiles])
      if (map.getLayer('precip')) map.setPaintProperty('precip', 'raster-opacity', opacity / 100)
    },
    [tiles, opacity],
  )

  return null
}
