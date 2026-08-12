import type { RasterTileSource } from 'maplibre-gl'
import { useFeatureOption } from '@/core/settings/store'
import { useTimeline } from '@/core/time/timelineStore'
import { useMapLayer } from '@/map/useMapLayer'
import { addDataLayer } from '@/map/layerOrder'
import { iemValidTime, iemTileTemplate, CONUS } from '@/features/radar/iem'
import { mosaicUrl, registerMosaicProtocol } from '@/features/radar/mosaic/protocol'

/** Past this the mosaic has no more detail; MapLibre overzooms instead. */
const MAXZOOM = 12

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
  const simTime = useTimeline((s) => s.simTime)
  const opacity = useFeatureOption<number>('radar', 'opacity')
  const floorDbz = useFeatureOption<number>('radar', 'floor')

  registerMosaicProtocol()
  const tiles = mosaicUrl(iemTileTemplate(iemValidTime(simTime, Date.now())), floorDbz)

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
      }
    },
    [tiles, opacity],
  )

  return null
}
