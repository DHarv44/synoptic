/** Draw order for globe surface layers (all near-coincident radii). */
export const RENDER_ORDER = {
  globe: 0,
  satellite: 0.5,
  tiles: 1,
  tilesOverlay: 1.5,
  graticule: 2,
  coastlines: 3,
  alerts: 3.5,
  probe: 4,
  lightning: 5,
} as const
