import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { noteRequestedUrl, prefetchFrames, recentBboxes } from '@/features/radar/mosaic/prefetch'

const NOW = Date.parse('2026-08-11T23:18:40Z')

/** A tile bbox `size` metres wide, `n` steps east — the real URL shape. */
function bbox(size: number, n = 0): string {
  const w = -9549125 + n * size
  return `${w},4383204,${w + size},${4383204 + size}`
}
const FINE = 39136
const COARSE = 313086

const url = (b: string): string => `https://example.test/wms?TIME=2026-08-11T23:10:00Z&BBOX=${b}`

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  // Age out anything a previous test recorded, then reset the clock.
  recentBboxes(NOW + 10 * 60_000)
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('bbox registry', () => {
  it('records the bbox MapLibre asked for', () => {
    noteRequestedUrl(url(bbox(FINE)))
    expect(recentBboxes()).toEqual([bbox(FINE)])
  })

  it('ignores urls without a bbox', () => {
    noteRequestedUrl('https://example.test/wms?SERVICE=WMS')
    expect(recentBboxes()).toEqual([])
  })

  it('forgets bboxes once they stop being requested, so panning replaces them', () => {
    noteRequestedUrl(url(bbox(FINE, 1)))
    vi.setSystemTime(NOW + 45_000)
    noteRequestedUrl(url(bbox(FINE, 2)))
    expect(recentBboxes()).toEqual([bbox(FINE, 2)])
  })

  it('keeps a bbox alive while it is still being requested', () => {
    noteRequestedUrl(url(bbox(FINE)))
    vi.setSystemTime(NOW + 8_000)
    noteRequestedUrl(url(bbox(FINE)))
    vi.setSystemTime(NOW + 16_000)
    expect(recentBboxes()).toEqual([bbox(FINE)])
  })

  it('keeps only the finest tiles, dropping overzoom parents and the last view', () => {
    for (let i = 0; i < 4; i++) noteRequestedUrl(url(bbox(COARSE, i)))
    for (let i = 0; i < 3; i++) noteRequestedUrl(url(bbox(FINE, i)))
    const kept = recentBboxes()
    expect(kept).toHaveLength(3)
    expect(kept.every((b) => b === bbox(FINE, kept.indexOf(b)))).toBe(true)
  })

  it('caps a sweep, keeping the most recent bboxes', () => {
    for (let i = 0; i < 80; i++) noteRequestedUrl(url(bbox(FINE, i)))
    const kept = recentBboxes()
    expect(kept).toHaveLength(64)
    expect(kept.at(-1)).toBe(bbox(FINE, 79))
    expect(kept).not.toContain(bbox(FINE, 0))
  })
})

describe('prefetchFrames', () => {
  function stubFetch(): string[] {
    const calls: string[] = []
    vi.stubGlobal('fetch', (u: string) => {
      calls.push(u)
      return Promise.resolve({ blob: () => Promise.resolve(new Blob()) })
    })
    return calls
  }

  it('requests every frame for every visible bbox', async () => {
    noteRequestedUrl(url(bbox(FINE, 0)))
    noteRequestedUrl(url(bbox(FINE, 1)))
    const calls = stubFetch()
    await prefetchFrames((b, i) => `f${i}:${b}`, 3, new AbortController().signal)
    expect(calls).toHaveLength(6)
    expect(new Set(calls.map((c) => c.split(':')[0]))).toEqual(new Set(['f0', 'f1', 'f2']))
  })

  it('warms oldest first, reporting readiness in playback order', async () => {
    noteRequestedUrl(url(bbox(FINE)))
    const calls = stubFetch()
    const ready: number[] = []
    await prefetchFrames((b, i) => `f${i}:${b}`, 4, new AbortController().signal, (n) =>
      ready.push(n),
    )
    expect(calls.map((c) => c.split(':')[0])).toEqual(['f0', 'f1', 'f2', 'f3'])
    expect(ready).toEqual([1, 2, 3, 4])
  })

  it('does nothing when no tiles have been seen', async () => {
    const calls = stubFetch()
    const ready: number[] = []
    await prefetchFrames((b, i) => `f${i}:${b}`, 3, new AbortController().signal, (n) =>
      ready.push(n),
    )
    expect(calls).toEqual([])
    expect(ready).toEqual([])
  })

  it('stops early when aborted, and reports nothing ready', async () => {
    noteRequestedUrl(url(bbox(FINE)))
    const calls = stubFetch()
    const controller = new AbortController()
    controller.abort()
    const ready: number[] = []
    await prefetchFrames((b, i) => `f${i}:${b}`, 50, controller.signal, (n) => ready.push(n))
    expect(calls).toEqual([])
    expect(ready).toEqual([])
  })

  it('survives a failing request rather than abandoning the rest', async () => {
    noteRequestedUrl(url(bbox(FINE)))
    const calls: string[] = []
    vi.stubGlobal('fetch', (u: string) => {
      calls.push(u)
      return u.startsWith('f1')
        ? Promise.reject(new Error('offline'))
        : Promise.resolve({ blob: () => Promise.resolve(new Blob()) })
    })
    const ready: number[] = []
    await prefetchFrames((b, i) => `f${i}:${b}`, 3, new AbortController().signal, (n) =>
      ready.push(n),
    )
    expect(calls).toHaveLength(3)
    expect(ready).toEqual([1, 2, 3])
  })
})
