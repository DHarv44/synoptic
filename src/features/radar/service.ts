import type { SourceRef } from '@/core/data/types'

export const RAINVIEWER: SourceRef = { id: 'rainviewer', label: 'RainViewer' }

export const WEATHER_MAPS_URL = 'https://api.rainviewer.com/public/weather-maps.json'

export interface RadarFrame {
  time: number // unix seconds
  path: string
}

export interface RainViewerMaps {
  host: string
  radar: {
    past: RadarFrame[]
    nowcast: RadarFrame[]
  }
}

export function allFrames(maps: RainViewerMaps): RadarFrame[] {
  return [...maps.radar.past, ...maps.radar.nowcast]
}

/**
 * How far before the oldest frame the clock may sit and still get that
 * frame — one and a half of RainViewer's 10-minute intervals.
 */
export const FRAME_TOLERANCE_S = 15 * 60

/**
 * Frame nearest to (at or before) simTime. Future times clamp to the newest
 * frame, as the mosaic does — radar has no forecast, so the latest scan is
 * the honest answer. The PAST does not clamp: RainViewer keeps only a couple
 * of hours, and showing its oldest frame at −24 h presented a 2-hour-old sky
 * as yesterday's. Past the tolerance there is no frame, and the layer
 * draws nothing.
 */
export function pickFrame(frames: RadarFrame[], simTimeMs: number): RadarFrame | null {
  if (frames.length === 0) return null
  const simS = simTimeMs / 1000
  if (simS < frames[0].time - FRAME_TOLERANCE_S) return null
  let best = frames[0]
  for (const f of frames) {
    if (f.time <= simS) best = f
    else break
  }
  return best
}

/** XYZ tile URL template for a frame (maplibre raster `tiles` entry). */
export function tileUrlTemplate(
  maps: RainViewerMaps,
  frame: RadarFrame,
  scheme: string,
  smooth: boolean,
): string {
  return `${maps.host}${frame.path}/256/{z}/{x}/{y}/${scheme}/${smooth ? '1' : '0'}_1.png`
}
