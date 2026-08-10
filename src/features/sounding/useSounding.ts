import { useProbe } from '@/core/probe/store'
import { useTimeline } from '@/core/time/timelineStore'
import { useCachedFetch } from '@/core/data/useCachedFetch'
import {
  fetchSoundingSeries,
  soundingAt,
  type Sounding,
} from '@/core/data/openMeteo/sounding'

const CACHE_MAX_AGE_MS = 15 * 60_000

interface SoundingState {
  sounding: Sounding | null
  loading: boolean
  error: string | null
}

type Series = Awaited<ReturnType<typeof fetchSoundingSeries>>

/** Vertical profile for the probe point at the timeline hour. */
export function useSounding(): SoundingState {
  const point = useProbe((s) => s.point)
  const simTime = useTimeline((s) => s.simTime)
  const key = point ? `sounding:${point.lat.toFixed(2)},${point.lon.toFixed(2)}` : null
  const { data, loading, error } = useCachedFetch<Series>(key, CACHE_MAX_AGE_MS, () =>
    fetchSoundingSeries(point?.lat ?? 0, point?.lon ?? 0),
  )
  const sounding = data && point ? soundingAt(data, simTime) : null
  return { sounding, loading, error }
}
