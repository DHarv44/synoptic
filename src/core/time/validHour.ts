import { useEffect, useState } from 'react'
import { useTimeline } from '@/core/time/timelineStore'

const HOUR_MS = 3600_000

/**
 * The timeline clock floored to the hour, settled: model products change
 * hourly at most, and a stepper click or slider drag must not fire a
 * multi-megabyte fetch per intermediate value. Emits after the clock has
 * rested on an hour for `settleMs`.
 */
export function useValidHour(settleMs = 400): number {
  const simTime = useTimeline((s) => s.simTime)
  const hour = Math.floor(simTime / HOUR_MS) * HOUR_MS
  const [settled, setSettled] = useState(hour)
  useEffect(() => {
    if (hour === settled) return
    const id = window.setTimeout(() => setSettled(hour), settleMs)
    return () => window.clearTimeout(id)
  }, [hour, settled, settleMs])
  return settled
}
