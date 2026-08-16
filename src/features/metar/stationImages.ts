import type { Map as MLMap } from 'maplibre-gl'
import { makeStationCanvas, STATION_COLORS } from '@/features/metar/drawStationModel'
import type { Metar } from '@/features/metar/service'

/**
 * Each station plot is its own generated sprite, because a station model
 * encodes several values at once and no fixed icon set covers it. Generating
 * one costs a canvas draw plus a `getImageData` readback, which is cheap
 * individually and brutal eighty at a time: panning across a fetch boundary
 * did exactly that in a single synchronous pass and froze the map until it
 * finished.
 *
 * So: cache what has been drawn, and draw the rest a few per frame. Stations
 * appear over a moment instead of the map stopping dead.
 */
const CACHE_MAX = 800
const cache = new Map<string, ImageData>()

/** Per frame. Enough to fill a viewport quickly, small enough to stay smooth. */
const BATCH = 6

export function stationImageId(s: Metar, scheme: 'dark' | 'light', tempUnit: 'C' | 'F'): string {
  // The id encodes everything the sprite draws: with only station+scheme,
  // a cached sprite kept showing its first observation all session.
  const dir = typeof s.wdir === 'number' ? Math.round(s.wdir / 10) : 'v'
  const bits = [
    s.temp === null ? '' : Math.round(s.temp),
    s.dewp === null ? '' : Math.round(s.dewp),
    s.wspd === null ? '' : Math.round(s.wspd),
    dir,
    s.fltCat ?? '',
    tempUnit,
  ].join('/')
  return `metar-${s.icaoId}-${scheme}-${bits}`
}

function draw(s: Metar, scheme: 'dark' | 'light', tempUnit: 'C' | 'F'): ImageData {
  const canvas = makeStationCanvas(s, STATION_COLORS[scheme], tempUnit)
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

/**
 * Register sprites for these stations, spreading the work across frames.
 * Returns a cancel function; call it when the station set changes so a
 * superseded batch stops drawing.
 */
export function ensureStationImages(
  map: MLMap,
  stations: Metar[],
  scheme: 'dark' | 'light',
  tempUnit: 'C' | 'F',
): () => void {
  const pending: Metar[] = []
  for (const s of stations) {
    const id = stationImageId(s, scheme, tempUnit)
    if (map.hasImage(id)) continue
    const hit = cache.get(id)
    if (hit) {
      map.addImage(id, hit, { pixelRatio: 2 })
      continue
    }
    pending.push(s)
  }
  if (pending.length === 0) return () => undefined

  let cancelled = false
  let i = 0
  let frame = 0
  const step = (): void => {
    if (cancelled) return
    const end = Math.min(i + BATCH, pending.length)
    for (; i < end; i++) {
      const s = pending[i]
      const id = stationImageId(s, scheme, tempUnit)
      if (map.hasImage(id)) continue
      const data = draw(s, scheme, tempUnit)
      cache.set(id, data)
      if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string)
      map.addImage(id, data, { pixelRatio: 2 })
    }
    if (i < pending.length) frame = requestAnimationFrame(step)
  }
  frame = requestAnimationFrame(step)

  return () => {
    cancelled = true
    cancelAnimationFrame(frame)
  }
}
