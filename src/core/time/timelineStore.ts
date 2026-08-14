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

/** Every frame in the loop, oldest first. */
export function loopFrames(nowMs: number): number[] {
  const out: number[] = []
  for (let t = loopStart(nowMs); t <= newestFrame(nowMs); t += LOOP_FRAME_MS) out.push(t)
  return out
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
  /**
   * Frames warmed from the oldest. `null` means nothing is reporting — the
   * worldwide composite has no prefetcher — and the loop must run ungated
   * rather than wait for news that will never come. 0 means a loader is
   * active but has nothing ready yet, which is a hold, not a free pass.
   */
  warmFrames: number | null
  setSimTime: (ms: number) => void
  goLive: () => void
  setPlaying: (playing: boolean) => void
  setFrameMs: (ms: number) => void
  setWarmFrames: (count: number | null) => void
  /** Step one frame, wrapping at the newest or at the warm edge. */
  advanceFrame: () => void
  /** Follow the wall clock while live (called by the clock driver). */
  tick: () => void
}

/** What survives a reload. Only the loop speed is a preference. */
export function persistedTimeline(s: TimelineState): { frameMs: number } {
  return { frameMs: s.frameMs }
}

/**
 * Carry the loop speed across schema changes. Without this a version bump
 * throws the whole blob away, so the one setting worth keeping resets.
 * v1's `speed` was sim-seconds per real second and means nothing to a
 * frame-based loop, so it is dropped rather than reinterpreted.
 */
export function migrateTimeline(persisted: unknown): { frameMs: number } {
  const p = (persisted ?? {}) as { frameMs?: unknown }
  return { frameMs: typeof p.frameMs === 'number' ? p.frameMs : DEFAULT_FRAME_MS }
}

/**
 * A load always starts live.
 *
 * Restoring the scrub position sounded considerate and was not: reopen a tab
 * an hour later and the map silently shows an hour-old sky, with nothing but
 * a small timestamp to say so. Playback made it far more likely, because
 * looping leaves `isLive` false — close the tab mid-loop and you come back in
 * the past. A weather display defaulting to anything other than now is a
 * safety problem, not a convenience.
 *
 * Playback never resumes either; a display that starts animating by itself is
 * alarming.
 */
export function rehydrateTimeline(
  persisted: unknown,
  current: TimelineState,
  nowMs: number,
): TimelineState {
  const p = (persisted ?? {}) as Partial<TimelineState>
  return {
    ...current,
    frameMs: p.frameMs ?? current.frameMs,
    simTime: nowMs,
    isLive: true,
    playing: false,
    warmFrames: null,
  }
}

export const useTimeline = create<TimelineState>()(
  persist(
    (set) => ({
      simTime: Date.now(),
      isLive: true,
      playing: false,
      frameMs: DEFAULT_FRAME_MS,
      warmFrames: null,
      setSimTime: (ms) =>
        set(() => {
          const now = Date.now()
          const clamped = Math.min(Math.max(ms, now - PAST_RANGE_MS), now + FUTURE_RANGE_MS)
          return { simTime: clamped, isLive: Math.abs(clamped - now) < 60_000, playing: false }
        }),
      goLive: () => set({ simTime: Date.now(), isLive: true, playing: false }),
      setPlaying: (playing) =>
        set((s) => {
          // Stopping ends the sweep, so nothing is reporting again.
          if (!playing) return { playing: false, warmFrames: null }
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
      setWarmFrames: (count) =>
        set((s) => (s.warmFrames === count ? s : { warmFrames: count })),
      advanceFrame: () =>
        set((s) => {
          const now = Date.now()
          const start = loopStart(now)
          const next = s.simTime + LOOP_FRAME_MS
          // Cycle only what has loaded. Running past the warm edge is what
          // made the loop stall on cold frames and then lurch as several
          // landed at once; instead the loop is short at first and lengthens
          // as frames arrive. At 0 this holds on the oldest frame — the
          // control shows it is loading — which beats animating tiles that
          // have not arrived.
          const pastWarm =
            s.warmFrames !== null && (next - start) / LOOP_FRAME_MS >= s.warmFrames
          // Wrapping re-reads the window, so a loop left running keeps
          // picking up new scans instead of cycling a frozen hour.
          const wrap = pastWarm || next > newestFrame(now)
          return { simTime: wrap ? start : next, isLive: false }
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
      // per loop frame). v3: the clock position is no longer persisted at all.
      // Old blobs simply fall back to the defaults.
      version: 3,
      partialize: persistedTimeline,
      migrate: migrateTimeline,
      merge: (persisted, current) => rehydrateTimeline(persisted, current, Date.now()),
    },
  ),
)

export function stepSimTime(deltaMs: number): void {
  const s = useTimeline.getState()
  s.setSimTime(s.simTime + deltaMs)
}

attachDevStore('timeline', useTimeline)
