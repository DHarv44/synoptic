import type { SourceRef } from '@/core/data/types'

export const IEM: SourceRef = { id: 'iem-nexrad', label: 'IEM NEXRAD mosaic' }

/** Time-aware WMS. The `/cache/tile.py` products ignore valid time — see below. */
const WMS = 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q-t.cgi'

/** CONUS-ish bounds (generous) for showing the high-res mosaic. */
export const CONUS = { latMin: 20, latMax: 55, lonMin: -130, lonMax: -60 }

export function overConus(lat: number, lon: number): boolean {
  return lat >= CONUS.latMin && lat <= CONUS.latMax && lon >= CONUS.lonMin && lon <= CONUS.lonMax
}

/** Mosaic generations are 5 minutes apart. */
const STEP_MS = 5 * 60_000

/**
 * The mosaic valid time to draw, quantized to a generation — or null once
 * the timeline scrubs past what this service usefully covers, where
 * RainViewer's 2h of frames takes over.
 *
 * One generation, requested explicitly, is the whole point. The cached tile
 * products (`nexrad-n0q-900913` and its `-mXXm` siblings) cannot give that:
 * they are rolling images with `max-age=300`, so every tile shows whichever
 * generation existed at its own fetch moment. Measured directly — one
 * lat/lon sampled at the same instant read deep red at z7 and yellow at
 * z10, and ten minutes later z10 had caught up to red. Each zoom level was
 * serving weather from a different time, so zooming redrew the same storms
 * minutes displaced, in visibly different places. Neighbouring tiles could
 * disagree the same way, which is where the hard rectangular seams came
 * from. An absolute TIME pins every tile at every zoom to one generation.
 */
export function iemValidTime(simTimeMs: number, nowMs: number): number | null {
  if ((nowMs - simTimeMs) / 60_000 > 50) return null
  // Step back one generation: the most recent one certain to be complete.
  return Math.floor((Math.min(simTimeMs, nowMs) - STEP_MS) / STEP_MS) * STEP_MS
}

/** ISO-8601 to the second, which is what the WMS `TIME` parameter wants. */
export function iemTimeParam(validMs: number): string {
  return new Date(validMs).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/**
 * MapLibre raster template against the time-aware WMS. Slower per tile than
 * the tilecache (~0.5s vs ~0.3s) because it renders on demand — the price of
 * every tile agreeing on what time it is.
 */
export function iemTileTemplate(validMs: number): string {
  const q = [
    'SERVICE=WMS',
    'VERSION=1.1.1',
    'REQUEST=GetMap',
    'LAYERS=nexrad-n0q-wmst',
    'SRS=EPSG:3857',
    'WIDTH=256',
    'HEIGHT=256',
    'FORMAT=image/png',
    'TRANSPARENT=true',
    `TIME=${iemTimeParam(validMs)}`,
  ].join('&')
  return `${WMS}?${q}&BBOX={bbox-epsg-3857}`
}
