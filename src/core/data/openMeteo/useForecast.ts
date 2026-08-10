import { useProbe } from '@/core/probe/store'
import { fetchJson } from '@/core/data/fetchJson'
import { useCachedFetch, type CachedFetchState } from '@/core/data/useCachedFetch'
import { forecastUrl, OPEN_METEO } from '@/core/data/openMeteo/forecast'
import type { OpenMeteoForecast } from '@/core/data/openMeteo/types'

const CACHE_MAX_AGE_MS = 10 * 60_000

/** Forecast for the current probe point; cached ~10 min per location. */
export function useForecast(): CachedFetchState<OpenMeteoForecast> {
  const point = useProbe((s) => s.point)
  const key = point ? `openmeteo:${point.lat.toFixed(2)},${point.lon.toFixed(2)}` : null
  return useCachedFetch(key, CACHE_MAX_AGE_MS, () =>
    fetchJson<OpenMeteoForecast>(OPEN_METEO, forecastUrl(point?.lat ?? 0, point?.lon ?? 0), {
      fixture: 'openmeteo-forecast',
    }),
  )
}
