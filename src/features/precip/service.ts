/**
 * MRMS precipitation accumulations from IEM's web-mercator tile cache.
 * Verified 2026-08-15: q2-n1p/p24h/p48h/p72h serve XYZ tiles; the 2-minute
 * rate product is WMS-EPSG:4326 only and is deliberately left out until it
 * has a mercator door. Tiles arrive in IEM's own precip palette.
 */

export interface PrecipProduct {
  /** IEM tile.py product prefix. */
  tile: string
  label: string
}

export const PRECIP_PRODUCTS: Record<string, PrecipProduct> = {
  p1h: { tile: 'q2-n1p-900913', label: '1-hour' },
  p24h: { tile: 'q2-p24h-900913', label: '24-hour' },
  p48h: { tile: 'q2-p48h-900913', label: '48-hour' },
  p72h: { tile: 'q2-p72h-900913', label: '72-hour' },
}

export function precipTileTemplate(product: string): string {
  const p = PRECIP_PRODUCTS[product] ?? PRECIP_PRODUCTS.p24h
  return `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/${p.tile}/{z}/{x}/{y}.png`
}
