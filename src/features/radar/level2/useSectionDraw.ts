import { useEffect } from 'react'
import type { Map as MLMap, MapMouseEvent } from 'maplibre-gl'
import { useRadar } from '@/features/radar/level2/store'

/**
 * Cross-section drawing mode: crosshair cursor, a line that rubber-bands
 * from the anchor to the pointer, and Esc to cancel. The click handling
 * itself lives with the layer's other map clicks.
 */
export function useSectionDraw(map: MLMap): void {
  const drawing = useRadar((s) => s.drawing)

  useEffect(() => {
    if (!drawing) {
      map.getCanvas().style.cursor = ''
      return
    }
    map.getCanvas().style.cursor = 'crosshair'

    const onMove = (e: MapMouseEvent): void => {
      const start = useRadar.getState().drawStart
      if (start) {
        useRadar
          .getState()
          .set({ sectionLine: [start, { lat: e.lngLat.lat, lon: e.lngLat.lng }] })
      }
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') useRadar.getState().cancelDraw()
    }
    map.on('mousemove', onMove)
    window.addEventListener('keydown', onKey)
    return () => {
      map.getCanvas().style.cursor = ''
      map.off('mousemove', onMove)
      window.removeEventListener('keydown', onKey)
    }
  }, [drawing, map])
}
