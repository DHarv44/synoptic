import { useProbe } from '@/core/probe/store'
import { fetchJson } from '@/core/data/fetchJson'
import { useCachedFetch, type CachedFetchState } from '@/core/data/useCachedFetch'
import {
  ENSEMBLE_SOURCE,
  MODELS_SOURCE,
  ensembleUrl,
  modelsUrl,
  type HourlyByModel,
} from '@/features/models/service'

const CACHE_MAX_AGE_MS = 30 * 60_000

export function useModels(enabled = true): CachedFetchState<HourlyByModel> {
  const point = useProbe((s) => s.point)
  const key = enabled && point ? `models:${point.lat.toFixed(2)},${point.lon.toFixed(2)}` : null
  return useCachedFetch(key, CACHE_MAX_AGE_MS, () =>
    fetchJson<HourlyByModel>(MODELS_SOURCE, modelsUrl(point?.lat ?? 0, point?.lon ?? 0), {
      fixture: 'openmeteo-models',
    }),
  )
}

export function useEnsemble(enabled: boolean): CachedFetchState<HourlyByModel> {
  const point = useProbe((s) => s.point)
  const key =
    enabled && point ? `ensemble:${point.lat.toFixed(2)},${point.lon.toFixed(2)}` : null
  return useCachedFetch(key, CACHE_MAX_AGE_MS, () =>
    fetchJson<HourlyByModel>(ENSEMBLE_SOURCE, ensembleUrl(point?.lat ?? 0, point?.lon ?? 0), {
      fixture: 'openmeteo-ensemble',
    }),
  )
}
