import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { attachDevStore } from '@/dev/wx'

export const PAST_RANGE_MS = 48 * 3600_000 // −48h
export const FUTURE_RANGE_MS = 16 * 24 * 3600_000 // +16d (forecast region)

/**
 * Granularity of the live clock. Sitting live, `simTime` used to take a new
 * value on every 250 ms tick, re-rendering every subscriber — the meteogram
 * cursor, radar and satellite frame pickers, the sounding lookup — four
 * times a second forever, for a display that only shows minutes and data
 * that changes every 5–10 minutes. Quantising means the store no-ops
 * between steps, so idle costs nothing. Well under the 60 s `isLive` window.
 */
const LIVE_STEP_MS = 10_000

/**
 * Playback is a radar loop, not a scrub of the whole timeline. Radar has no
 * forecast, so running the clock forward from now just freezes the picture
 * while the date climbs — which is what the play button used to do. Instead
 * it cycles a window of recent frames, the way every radar display does.
 */
export const LOOP_WINDOW_MS = 60 * 60_000

/** One mosaic generation. Stepping finer would redraw the same picture. */
export const LOOP_FRAME_MS = 5 * 60_000

/** Real ms per frame, slowest to fastest. */
export const FRAME_SPEEDS = [1000, 600, 350, 175] as const
export const DEFAULT_FRAME_MS = 350

/**
 * Frames the newest one is held for before wrapping. A loop that snaps
 * straight back to the oldest frame is hard to read — the pause is what
 * tells you where the cycle ends and lets you see the latest scan.
 */
export const LOOP_END_HOLD = 4

/** Oldest frame in the loop, aligned to generation boundaries. */
export function loopStart(nowMs: number): number {
  return newestFrame(nowMs) - LOOP_WINDOW_MS
}

/** Newest frame the loop will reach. */
export function newestFrame(nowMs: number): number {
  return Math.floor(nowMs / LOOP_FRAME_MS) * LOOP_FRAME_MS
}

/**
 * The one clock every layer obeys (PLAN.md §3.11). simTime is UTC ms.
 * isLive: simTime tracks wall clock; scrubbing detaches it.
 */
interface TimelineState {
  simTime: number
  isLive: boolean
  playing: boolean
  /** Real ms each loop frame is held. */
  frameMs: number
  setSimTime: (ms: number) => void
  goLive: () => void
  setPlaying: (playing: boolean) => void
  setFrameMs: (ms: number) => void
  /** Step one frame, wrapping at the newest. Driven by the clock. */
  advanceFrame: () => void
  /** Follow the wall clock while live (called by the clock driver). */
  tick: () => void
}

export const useTimeline = create<TimelineState>()(
  persist(
    (set) => ({
      simTime: Date.now(),
      isLive: true,
      playing: false,
      frameMs: DEFAULT_FRAME_MS,
      setSimTime: (ms) =>
        set(() => {
          const now = Date.now()
          const clamped = Math.min(Math.max(ms, now - PAST_RANGE_MS), now + FUTURE_RANGE_MS)
          return { simTime: clamped, isLive: Math.abs(clamped - now) < 60_000, playing: false }
        }),
      goLive: () => set({ simTime: Date.now(), isLive: true, playing: false }),
      setPlaying: (playing) =>
        set((s) => {
          if (!playing) return { playing: false }
          const now = Date.now()
          const start = loopStart(now)
          // Resume where it was paused, as long as that is still a frame the
          // loop covers. From live — or from anywhere outside the window —
          // begin at the oldest frame so the cycle starts immediately rather
          // than sitting on "now" waiting to wrap.
          const resumable = !s.isLive && s.simTime >= start && s.simTime < newestFrame(now)
          return { playing: true, isLive: false, simTime: resumable ? s.simTime : start }
        }),
      setFrameMs: (ms) => set({ frameMs: ms }),
      advanceFrame: () =>
        set((s) => {
          const now = Date.now()
          const next = s.simTime + LOOP_FRAME_MS
          // Wrapping re-reads the window, so a loop left running keeps
          // picking up new scans instead of cycling a frozen hour.
          return { simTime: next > newestFrame(now) ? loopStart(now) : next, isLive: false }
        }),
      tick: () =>
        set((s) => {
          if (!s.isLive || s.playing) return s
          const stepped = Math.floor(Date.now() / LIVE_STEP_MS) * LIVE_STEP_MS
          // Same reference = zustand skips the notify entirely.
          return stepped === s.simTime ? s : { simTime: stepped }
        }),
    }),
    {
      name: 'synoptic.timeline',
      // v2: `speed` (sim-seconds per real second) became `frameMs` (real ms
      // per loop frame). Old blobs simply fall back to the default.
      version: 2,
      partialize: (s) => ({ simTime: s.simTime, isLive: s.isLive, frameMs: s.frameMs }),
      /**
       * A scrub position only means something while it's still inside the
       * window. Come back tomorrow and yesterday's offset sits off the left
       * edge, so fall back to live rather than restoring a position that
       * can't be seen. Playback never resumes on load — a display that
       * starts animating by itself is alarming.
       */
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<TimelineState>
        const now = Date.now()
        const inWindow =
          typeof p.simTime === 'number' &&
          p.simTime >= now - PAST_RANGE_MS &&
          p.simTime <= now + FUTURE_RANGE_MS
        const live = p.isLive !== false || !inWindow
        return {
          ...current,
          frameMs: p.frameMs ?? current.frameMs,
          playing: false,
          isLive: live,
          simTime: live ? now : (p.simTime as number),
        }
      },
    },
  ),
)

export function stepSimTime(deltaMs: number): void {
  const s = useTimeline.getState()
  s.setSimTime(s.simTime + deltaMs)
}

attachDevStore('timeline', useTimeline)
