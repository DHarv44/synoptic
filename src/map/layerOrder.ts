import type { Map as MLMap } from 'maplibre-gl'
import { firstSymbolLayerId } from '@/map/useMapLayer'

type AddLayerObject = Parameters<MLMap['addLayer']>[0]

/**
 * Painter's order for our own layers, bottom to top.
 *
 * MapLibre draws in insertion order, and layers are added when their feature
 * mounts — so without this, the stack is whatever order features happened to
 * mount in, and toggling a layer off and on moved it to the top. That is how
 * radar ended up covering warning polygons.
 *
 * Roughly: imagery, then fields, then the translucent warning wash, then
 * point data, then warning boundaries. Warnings sit above everything because
 * a tornado polygon losing a fight with a reflectivity blob is the one
 * failure this display cannot afford.
 */
export const LAYER_ORDER = [
  'satellite',
  // One composite occupies 'radar' — they are alternatives, never a stack.
  // Single-site super-res is the genuine detail upgrade and sits above it.
  'radar',
  'radar-level2',
  'wind',
  'graticule',
  // Contoured reference fields (isobars, heights) under every hazard wash.
  'fields',
  // Aviation hazard washes sit under the NWS warning wash: a SIGMET is
  // advisory context, a tornado warning is the thing itself.
  'aviation-fill',
  'alerts-fill',
  // — the basemap's own labels draw here —
  'cells',
  'pirep',
  'metar',
  'lightning',
  'alerts-outline',
  'annotation',
] as const

export type LayerSlot = (typeof LAYER_ORDER)[number]

/**
 * Slots that draw above the basemap's place and road labels. Point data
 * earns it (a station model hidden by a street name is useless) and so do
 * warning boundaries; translucent washes do not.
 */
const ABOVE_LABELS = new Set<LayerSlot>([
  'cells',
  'pirep',
  'metar',
  'lightning',
  'alerts-outline',
  'annotation',
])

/**
 * Which slot each added layer belongs to. Entries are never removed: ids are
 * stable and reused across style reloads, so the map stays tiny, and a stale
 * id simply never matches a layer still in the style.
 */
const slotOfLayer = new Map<string, LayerSlot>()

/** The layer to insert before, so `slot` lands in its ordered position. */
function insertBefore(map: MLMap, slot: LayerSlot): string | undefined {
  const rank = LAYER_ORDER.indexOf(slot)
  const above = ABOVE_LABELS.has(slot)
  for (const layer of map.getStyle().layers) {
    const other = slotOfLayer.get(layer.id)
    // Only compare within the same band — inserting before an above-labels
    // layer would drag a below-labels layer above the labels with it.
    if (other === undefined || ABOVE_LABELS.has(other) !== above) continue
    if (LAYER_ORDER.indexOf(other) > rank) return layer.id
  }
  return above ? undefined : firstSymbolLayerId(map)
}

/**
 * Add a layer in its declared stacking position, whatever order features
 * mounted in. Use this instead of `map.addLayer` for anything the app owns.
 */
export function addDataLayer(map: MLMap, layer: AddLayerObject, slot: LayerSlot): void {
  slotOfLayer.set(layer.id, slot)
  map.addLayer(layer, insertBefore(map, slot))
}
