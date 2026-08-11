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
 * The one clock every layer obeys (PLAN.md §3.11). simTime is UTC ms.
 * isLive: simTime tracks wall clock; scrubbing detaches it.
 */
interface TimelineState {
  simTime: number
  isLive: boolean
  playing: boolean
  /** Sim seconds advanced per real second while playing. */
  speed: number
  setSimTime: (ms: number) => void
  goLive: () => void
  setPlaying: (playing: boolean) => void
  setSpeed: (speed: number) => void
  /** Advance by real-elapsed ms (called by the clock driver). */
  tick: (elapsedMs: number) => void
}

export const useTimeline = create<TimelineState>()(
  persist(
    (set) => ({
      simTime: Date.now(),
      isLive: true,
      playing: false,
      speed: 60,
      setSimTime: (ms) =>
        set(() => {
          const now = Date.now()
          const clamped = Math.min(Math.max(ms, now - PAST_RANGE_MS), now + FUTURE_RANGE_MS)
          return { simTime: clamped, isLive: Math.abs(clamped - now) < 60_000, playing: false }
        }),
      goLive: () => set({ simTime: Date.now(), isLive: true, playing: false }),
      setPlaying: (playing) => set({ playing }),
      setSpeed: (speed) => set({ speed }),
      tick: (elapsedMs) =>
        set((s) => {
          if (s.isLive && !s.playing) {
            const stepped = Math.floor(Date.now() / LIVE_STEP_MS) * LIVE_STEP_MS
            // Same reference = zustand skips the notify entirely.
            return stepped === s.simTime ? s : { simTime: stepped }
          }
          if (!s.playing) return s
          const now = Date.now()
          const next = s.simTime + elapsedMs * s.speed
          if (next >= now + FUTURE_RANGE_MS) {
            return { simTime: now + FUTURE_RANGE_MS, playing: false }
          }
          return { simTime: next, isLive: Math.abs(next - now) < 60_000 }
        }),
    }),
    {
      name: 'synoptic.timeline',
      version: 1,
      partialize: (s) => ({ simTime: s.simTime, isLive: s.isLive, speed: s.speed }),
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
          speed: p.speed ?? current.speed,
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
