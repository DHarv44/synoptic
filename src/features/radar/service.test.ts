import { describe, expect, it } from 'vitest'
import { pickFrame, type RadarFrame } from '@/features/radar/service'
import { iemValidTime, iemTileTemplate, iemTimeParam } from '@/features/radar/iem'

const frames: RadarFrame[] = [
  { time: 1000, path: '/a' },
  { time: 1600, path: '/b' },
  { time: 2200, path: '/c' },
]

describe('pickFrame', () => {
  it('picks the latest frame at or before sim time', () => {
    expect(pickFrame(frames, 1700_000)?.path).toBe('/b')
  })
  it('clamps to the first frame before the range', () => {
    expect(pickFrame(frames, 0)?.path).toBe('/a')
  })
  it('clamps to the last frame after the range', () => {
    expect(pickFrame(frames, 9999_000)?.path).toBe('/c')
  })
  it('returns null for no frames', () => {
    expect(pickFrame([], 1000)).toBeNull()
  })
})

describe('iemValidTime', () => {
  const now = Date.parse('2026-08-11T23:18:40Z')
  const at = (ms: number | null): string | null => (ms === null ? null : iemTimeParam(ms))

  it('quantizes to a 5-minute generation, one step back from now', () => {
    expect(at(iemValidTime(now, now))).toBe('2026-08-11T23:10:00Z')
  })

  it('follows the timeline backwards', () => {
    expect(at(iemValidTime(now - 20 * 60_000, now))).toBe('2026-08-11T22:50:00Z')
  })

  it('never asks for a time in the future', () => {
    expect(iemValidTime(now + 60 * 60_000, now)).toBeLessThan(now)
  })

  it('returns null beyond 50 minutes, where RainViewer takes over', () => {
    expect(iemValidTime(now - 60 * 60_000, now)).toBeNull()
  })
})

describe('iemTileTemplate', () => {
  const url = iemTileTemplate(Date.parse('2026-08-11T23:10:00Z'))

  it('pins an explicit valid time, so every zoom draws one generation', () => {
    expect(url).toContain('TIME=2026-08-11T23:10:00Z')
  })

  it('leaves the bbox token for maplibre to substitute', () => {
    expect(url).toContain('BBOX={bbox-epsg-3857}')
  })

  it('requests the time-aware layer, not the rolling tile cache', () => {
    expect(url).toContain('LAYERS=nexrad-n0q-wmst')
    expect(url).not.toContain('tile.py')
  })
})
