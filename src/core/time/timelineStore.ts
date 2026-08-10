import { create } from 'zustand'
import { attachDevStore } from '@/dev/wx'

export const PAST_RANGE_MS = 48 * 3600_000 // −48h
export const FUTURE_RANGE_MS = 16 * 24 * 3600_000 // +16d (forecast region)

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

export const useTimeline = create<TimelineState>((set) => ({
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
      if (s.isLive && !s.playing) return { simTime: Date.now() }
      if (!s.playing) return s
      const now = Date.now()
      const next = s.simTime + elapsedMs * s.speed
      if (next >= now + FUTURE_RANGE_MS) return { simTime: now + FUTURE_RANGE_MS, playing: false }
      return { simTime: next, isLive: Math.abs(next - now) < 60_000 }
    }),
}))

export function stepSimTime(deltaMs: number): void {
  const s = useTimeline.getState()
  s.setSimTime(s.simTime + deltaMs)
}

attachDevStore('timeline', useTimeline)
