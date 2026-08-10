import { useEffect, useState } from 'react'
import { cacheGet, cachePut } from '@/core/data/cache'

export interface CachedFetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * Fetch-through-IndexedDB-cache hook shared by probe-driven data hooks:
 * null key = idle; key change refetches (cache first), stale results are
 * discarded on unmount/key change.
 */
export function useCachedFetch<T>(
  key: string | null,
  maxAgeMs: number,
  fetcher: () => Promise<T>,
): CachedFetchState<T> {
  const [state, setState] = useState<CachedFetchState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  useEffect(() => {
    if (key === null) return
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    void (async () => {
      try {
        let data = await cacheGet<T>(key, maxAgeMs)
        if (!data) {
          data = await fetcher()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetcher identity intentionally ignored
  }, [key, maxAgeMs])

  return state
}
