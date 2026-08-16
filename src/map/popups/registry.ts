import type { ComponentType } from 'react'

/** Rendered inside the map popup with the clicked feature's properties. */
export interface MapPopupProps {
  properties: Record<string, unknown>
  onClose: () => void
}

export interface MapPopupEntry {
  /** Map layer ids whose features open this popup. */
  layerIds: string[]
  component: ComponentType<MapPopupProps>
}

const entries: MapPopupEntry[] = []

/**
 * Click-to-popover registry: a feature registers its clickable layers and
 * the card that explains one of its features. The map's single click
 * handler arbitrates — topmost registered feature wins, bare map falls
 * through to the location card. Features never learn about each other.
 */
export function registerMapPopup(entry: MapPopupEntry): void {
  entries.push(entry)
}

export function popupLayerIds(): string[] {
  return entries.flatMap((e) => e.layerIds)
}

export function popupFor(layerId: string): MapPopupEntry | undefined {
  return entries.find((e) => e.layerIds.includes(layerId))
}
