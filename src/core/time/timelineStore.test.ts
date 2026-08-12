import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  LOOP_FRAME_MS,
  LOOP_WINDOW_MS,
  loopStart,
  newestFrame,
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
