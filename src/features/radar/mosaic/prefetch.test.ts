import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { noteRequestedUrl, prefetchFrames, recentBboxes } from '@/features/radar/mosaic/prefetch'

const NOW = Date.parse('2026-08-11T23:18:40Z')
const url = (bbox: string): string =>
  `https://example.test/wms?SERVICE=WMS&TIME=2026-08-11T23:10:00Z&BBOX=${bbox}`

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  // Each test starts from a clean registry: age everything out.
  recentBboxes(NOW + 10 * 60_000)
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('bbox registry', () => {
  it('records the bbox MapLibre asked for', () => {
    noteRequestedUrl(url('1,2,3,4'))
    expect(recentBboxes()).toEqual(['1,2,3,4'])
  })

  it('ignores urls without a bbox', () => {
    noteRequestedUrl('https://example.test/wms?SERVICE=WMS')
    expect(recentBboxes()).toEqual([])
  })

  it('forgets bboxes once they stop being requested, so panning replaces them', () => {
    noteRequestedUrl(url('old'))
    vi.setSystemTime(NOW + 45_000)
    noteRequestedUrl(url('new'))
    expect(recentBboxes()).toEqual(['new'])
  })

  it('keeps a bbox alive while it is still being requested', () => {
    noteRequestedUrl(url('a'))
    vi.setSystemTime(NOW + 8_000)
    noteRequestedUrl(url('a'))
    vi.setSystemTime(NOW + 16_000)
    expect(recentBboxes()).toEqual(['a'])
  })

  it('caps a sweep, keeping the most recent bboxes', () => {
    for (let i = 0; i < 60; i++) noteRequestedUrl(url(`b${i}`))
    const kept = recentBboxes()
    expect(kept.length).toBe(48)
    expect(kept.at(-1)).toBe('b59')
    expect(kept).not.toContain('b0')
  })

  it('treats a re-request as recent for the cap, not just for expiry', () => {
    noteRequestedUrl(url('first'))
    for (let i = 0; i < 47; i++) noteRequestedUrl(url(`x${i}`))
    noteRequestedUrl(url('first')) // still in view, asked for again
    noteRequestedUrl(url('newest'))
    expect(recentBboxes()).toContain('first')
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
    noteRequestedUrl(url('a'))
    noteRequestedUrl(url('b'))
    const calls = stubFetch()
    await prefetchFrames((bbox, i) => `f${i}:${bbox}`, 3, new AbortController().signal)
    expect(calls.sort()).toEqual(['f0:a', 'f0:b', 'f1:a', 'f1:b', 'f2:a', 'f2:b'])
  })

  it('does nothing when no tiles have been seen', async () => {
    const calls = stubFetch()
    await prefetchFrames((bbox, i) => `f${i}:${bbox}`, 3, new AbortController().signal)
    expect(calls).toEqual([])
  })

  it('stops early when aborted', async () => {
    noteRequestedUrl(url('a'))
    const calls = stubFetch()
    const controller = new AbortController()
    controller.abort()
    await prefetchFrames((bbox, i) => `f${i}:${bbox}`, 50, controller.signal)
    expect(calls).toEqual([])
  })

  it('survives a failing request rather than abandoning the rest', async () => {
    noteRequestedUrl(url('a'))
    const calls: string[] = []
    vi.stubGlobal('fetch', (u: string) => {
      calls.push(u)
      return u === 'f1:a'
        ? Promise.reject(new Error('offline'))
        : Promise.resolve({ blob: () => Promise.resolve(new Blob()) })
    })
    await prefetchFrames((bbox, i) => `f${i}:${bbox}`, 3, new AbortController().signal)
    expect(calls.sort()).toEqual(['f0:a', 'f1:a', 'f2:a'])
  })
})
