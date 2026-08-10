import { useEffect } from 'react'
import type { Map as MLMap } from 'maplibre-gl'
import { useMapContext } from '@/map/MapView'

/**
 * Effect wrapper for MapLibre sources/layers: re-runs after every base
 * style (re)load — setStyle wipes custom sources, so layer setup must be
 * keyed on styleVersion. Return a cleanup that removes what you added
 * (skipped automatically if the style is already gone).
 */
/**
 * The basemap's first symbol (label) layer id — insert data layers before
 * it so place names and road labels stay readable above radar/satellite.
 */
export function firstSymbolLayerId(map: MLMap): string | undefined {
  return map.getStyle().layers.find((l) => l.type === 'symbol')?.id
}

export function useMapLayer(
  setup: (map: MLMap) => void | (() => void),
  deps: unknown[],
): void {
  const { map, styleVersion } = useMapContext()
  useEffect(() => {
    if (!map.isStyleLoaded() && !map.getStyle()) return
    const cleanup = setup(map)
    return () => {
      if (!map.getStyle()) return // map torn down or mid-style-swap
      cleanup?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps proxied
  }, [map, styleVersion, ...deps])
}
