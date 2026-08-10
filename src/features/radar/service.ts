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

/** Frame nearest to (at or before) simTime; clamps to the available range. */
export function pickFrame(frames: RadarFrame[], simTimeMs: number): RadarFrame | null {
  if (frames.length === 0) return null
  const simS = simTimeMs / 1000
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
