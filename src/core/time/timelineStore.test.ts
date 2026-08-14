import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_FRAME_MS,
  LOOP_FRAME_MS,
  LOOP_WINDOW_MS,
  migrateTimeline,
  loopStart,
  newestFrame,
  persistedTimeline,
  rehydrateTimeline,
  useTimeline,
} from '@/core/time/timelineStore'

const NOW = Date.parse('2026-08-11T23:18:40Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  useTimeline.setState({ simTime: NOW, isLive: true, playing: false })
})

afterEach(() => {
  vi.useRealTimers()
})

const state = () => useTimeline.getState()

describe('loop window', () => {
  it('aligns frames to generation boundaries', () => {
    expect(newestFrame(NOW)).toBe(Date.parse('2026-08-11T23:15:00Z'))
    expect(loopStart(NOW)).toBe(newestFrame(NOW) - LOOP_WINDOW_MS)
  })
})

describe('play', () => {
  it('starts at the oldest frame when live, instead of running into the future', () => {
    state().setPlaying(true)
    expect(state().simTime).toBe(loopStart(NOW))
    expect(state().isLive).toBe(false)
    expect(state().playing).toBe(true)
  })

  it('resumes where it was paused, mid-loop', () => {
    const mid = loopStart(NOW) + 4 * LOOP_FRAME_MS
    useTimeline.setState({ simTime: mid, isLive: false, playing: false })
    state().setPlaying(true)
    expect(state().simTime).toBe(mid)
  })

  it('restarts the loop when resuming from outside the window', () => {
    useTimeline.setState({ simTime: NOW - 6 * 3600_000, isLive: false, playing: false })
    state().setPlaying(true)
    expect(state().simTime).toBe(loopStart(NOW))
  })

  it('pausing keeps the current frame', () => {
    state().setPlaying(true)
    state().advanceFrame()
    const held = state().simTime
    state().setPlaying(false)
    expect(state()).toMatchObject({ playing: false, simTime: held })
  })
})

describe('advanceFrame', () => {
  it('steps one generation at a time', () => {
    state().setPlaying(true)
    const first = state().simTime
    state().advanceFrame()
    expect(state().simTime).toBe(first + LOOP_FRAME_MS)
  })

  it('wraps to the oldest frame after the newest', () => {
    useTimeline.setState({ simTime: newestFrame(NOW), isLive: false, playing: true })
    state().advanceFrame()
    expect(state().simTime).toBe(loopStart(NOW))
  })

  it('never shows a frame ahead of now', () => {
    state().setPlaying(true)
    for (let i = 0; i < 40; i++) {
      state().advanceFrame()
      expect(state().simTime).toBeLessThanOrEqual(newestFrame(NOW))
    }
  })

  it('extends into scans that arrived while it was looping', () => {
    useTimeline.setState({ simTime: newestFrame(NOW), isLive: false, playing: true })
    vi.setSystemTime(NOW + 30 * 60_000)
    // No longer the newest frame, so it carries on rather than wrapping early.
    state().advanceFrame()
    expect(state().simTime).toBe(newestFrame(NOW) + LOOP_FRAME_MS)
  })

  it('wraps to a window that reflects now, not the one it started with', () => {
    vi.setSystemTime(NOW + 30 * 60_000)
    const later = Date.now()
    useTimeline.setState({ simTime: newestFrame(later), isLive: false, playing: true })
    state().advanceFrame()
    expect(state().simTime).toBe(loopStart(later))
    expect(state().simTime).toBeGreaterThan(loopStart(NOW))
  })
})

describe('warm-frame gating', () => {
  const frameAt = (i: number): number => loopStart(NOW) + i * LOOP_FRAME_MS

  it('cycles only the frames that have loaded', () => {
    useTimeline.setState({ simTime: frameAt(2), isLive: false, playing: true, warmFrames: 3 })
    state().advanceFrame()
    expect(state().simTime).toBe(loopStart(NOW))
  })

  it('lengthens the loop as more frames arrive', () => {
    useTimeline.setState({ simTime: frameAt(2), isLive: false, playing: true, warmFrames: 6 })
    state().advanceFrame()
    expect(state().simTime).toBe(frameAt(3))
  })

  it('runs ungated when nothing is reporting — the worldwide source has no prefetcher', () => {
    useTimeline.setState({ simTime: frameAt(2), isLive: false, playing: true, warmFrames: null })
    state().advanceFrame()
    expect(state().simTime).toBe(frameAt(3))
  })

  it('holds on the oldest frame while a loader has nothing ready yet', () => {
    useTimeline.setState({ simTime: loopStart(NOW), isLive: false, playing: true, warmFrames: 0 })
    state().advanceFrame()
    expect(state().simTime).toBe(loopStart(NOW))
  })

  it('still stops at now even when more frames claim to be warm', () => {
    useTimeline.setState({
      simTime: newestFrame(NOW),
      isLive: false,
      playing: true,
      warmFrames: 99,
    })
    state().advanceFrame()
    expect(state().simTime).toBe(loopStart(NOW))
  })

  it('forgets what was warm when playback stops', () => {
    useTimeline.setState({ warmFrames: 5, playing: true })
    state().setPlaying(false)
    expect(state().warmFrames).toBeNull()
  })
})

describe('rehydration', () => {
  const rehydrate = (stored: unknown) => rehydrateTimeline(stored, state(), NOW)

  it('starts live even though the tab was closed hours into the past', () => {
    const out = rehydrate({ simTime: NOW - 6 * 3600_000, isLive: false, playing: true })
    expect(out).toMatchObject({ isLive: true, simTime: NOW, playing: false })
  })

  it('starts live even from a position still inside the window', () => {
    expect(rehydrate({ simTime: NOW - 20 * 60_000, isLive: false })).toMatchObject({
      isLive: true,
      simTime: NOW,
    })
  })

  it('never resumes playback', () => {
    expect(rehydrate({ playing: true, warmFrames: 8 })).toMatchObject({
      playing: false,
      warmFrames: null,
    })
  })

  it('keeps loop speed, which is a real preference', () => {
    expect(rehydrate({ frameMs: 1000 }).frameMs).toBe(1000)
  })

  it('copes with an empty or absent blob', () => {
    expect(rehydrate({})).toMatchObject({ isLive: true, simTime: NOW })
    expect(rehydrate(undefined)).toMatchObject({ isLive: true, simTime: NOW })
  })

  it('persists the speed and nothing about the clock', () => {
    const kept = persistedTimeline({ ...state(), simTime: NOW, isLive: false, frameMs: 600 })
    expect(Object.keys(kept)).toEqual(['frameMs'])
  })

  it('carries the speed across a version bump instead of dropping the blob', () => {
    expect(migrateTimeline({ frameMs: 1000, simTime: NOW, isLive: false })).toEqual({
      frameMs: 1000,
    })
  })

  it('drops v1 `speed`, which meant something else entirely', () => {
    expect(migrateTimeline({ speed: 60 })).toEqual({ frameMs: DEFAULT_FRAME_MS })
    expect(migrateTimeline(undefined)).toEqual({ frameMs: DEFAULT_FRAME_MS })
  })
})

describe('tick', () => {
  it('follows the wall clock while live', () => {
    vi.setSystemTime(NOW + 45_000)
    state().tick()
    expect(state().simTime).toBeGreaterThan(NOW)
  })

  it('leaves the frame alone while looping', () => {
    state().setPlaying(true)
    const frame = state().simTime
    vi.setSystemTime(NOW + 45_000)
    state().tick()
    expect(state().simTime).toBe(frame)
  })
})
