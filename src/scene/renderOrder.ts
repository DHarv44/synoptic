/** Draw order for globe surface layers (all near-coincident radii). */
export const RENDER_ORDER = {
  globe: 0,
  tiles: 1,
  graticule: 2,
  coastlines: 3,
  probe: 4,
} as const
