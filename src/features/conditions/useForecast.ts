import { useEffect, useState } from 'react'
import { fetchJson } from '@/core/data/fetchJson'
import { cacheGet, cachePut } from '@/core/data/cache'
import { useProbe } from '@/core/probe/store'
import { forecastUrl, OPEN_METEO } from '@/features/conditions/service'
import type { OpenMeteoForecast } from '@/features/conditions/types'

const CACHE_MAX_AGE_MS = 10 * 60_000

interface ForecastState {
  data: OpenMeteoForecast | null
  loading: boolean
  error: string | null
}

/** Forecast for the current probe point; cached ~10 min per location. */
export function useForecast(): ForecastState {
  const point = useProbe((s) => s.point)
  const [state, setState] = useState<ForecastState>({ data: null, loading: false, error: null })

  useEffect(() => {
    if (!point) return
    let cancelled = false
    const key = `openmeteo:${point.lat.toFixed(2)},${point.lon.toFixed(2)}`
    setState((s) => ({ ...s, loading: true, error: null }))

    void (async () => {
      try {
        let data = await cacheGet<OpenMeteoForecast>(key, CACHE_MAX_AGE_MS)
        if (!data) {
          data = await fetchJson<OpenMeteoForecast>(OPEN_METEO, forecastUrl(point.lat, point.lon), {
            fixture: 'openmeteo-forecast',
          })
          await cachePut(key, data)
        }
        if (!cancelled) setState({ data, loading: false, error: null })
      } catch (e) {
        if (!cancelled) {
          setState({ data: null, loading: false, error: e instanceof Error ? e.message : String(e) })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [point])

  return state
}
