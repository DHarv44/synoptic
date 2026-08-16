import { useProbe } from '@/core/probe/store'
import { useTimeline } from '@/core/time/timelineStore'
import { useCachedFetch } from '@/core/data/useCachedFetch'
import {
  airQualityAt,
  fetchAirQuality,
  type AirQualityNow,
  type AirQualityResponse,
} from '@/core/data/openMeteo/airQuality'

const CACHE_MAX_AGE_MS = 30 * 60_000

/** US AQI at the probe point for the timeline hour; null while idle/loading. */
export function useAirQuality(): AirQualityNow | null {
  const point = useProbe((s) => s.point)
  const simTime = useTimeline((s) => s.simTime)
  const key = point ? `airquality:${point.lat.toFixed(2)},${point.lon.toFixed(2)}` : null
  const { data } = useCachedFetch<AirQualityResponse>(key, CACHE_MAX_AGE_MS, () =>
    fetchAirQuality(point?.lat ?? 0, point?.lon ?? 0),
  )
  return data && point ? airQualityAt(data, simTime) : null
}
