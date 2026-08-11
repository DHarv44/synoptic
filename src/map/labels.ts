import type { Map as MLMap } from 'maplibre-gl'

/**
 * Basemap place labels are styled for a bare map, so they sit on top of
 * saturated radar with almost no separation — a grey town name over a red
 * core is unreadable exactly when you most want to know which town it is.
 *
 * Rather than fork the hosted style, restate the halo after it loads:
 * a heavier, opaque outline in the background colour, and text pushed
 * toward full contrast. Radar sits below labels in the stacking order, so
 * this is the only thing standing between the two.
 */
export function strengthenLabels(map: MLMap, scheme: 'dark' | 'light'): void {
  const dark = scheme === 'dark'
  const haloColor = dark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)'
  const textColor = dark ? '#eef2f6' : '#1c2430'

  for (const layer of map.getStyle().layers) {
    if (layer.type !== 'symbol') continue
    // Only labels — icon-only layers have no text to outline.
    if (!(layer.layout as { 'text-field'?: unknown } | undefined)?.['text-field']) continue
    try {
      map.setPaintProperty(layer.id, 'text-halo-color', haloColor)
      map.setPaintProperty(layer.id, 'text-halo-width', 1.6)
      map.setPaintProperty(layer.id, 'text-halo-blur', 0.2)
      map.setPaintProperty(layer.id, 'text-color', textColor)
    } catch {
      // A layer that doesn't accept these is not worth failing the map over.
    }
  }
}
