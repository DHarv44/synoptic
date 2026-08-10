import { useEffect, useState } from 'react'
import { Spotlight } from '@mantine/spotlight'
import { useDebouncedValue } from '@mantine/hooks'
import { fetchJson } from '@/core/data/fetchJson'
import { useProbe } from '@/core/probe/store'
import { useCameraStore } from '@/map/cameraStore'
import {
  GEOCODING,
  describeResult,
  geocodingUrl,
  type GeoResult,
  type GeocodingResponse,
} from '@/features/search/service'

/** Ctrl+K location search (Open-Meteo geocoding) → probe + fly-to. */
export function SearchSpotlight() {
  const [query, setQuery] = useState('')
  const [debounced] = useDebouncedValue(query, 300)
  const [results, setResults] = useState<GeoResult[]>([])
  const setPoint = useProbe((s) => s.setPoint)
  const requestFlyTo = useCameraStore((s) => s.requestFlyTo)

  useEffect(() => {
    const q = debounced.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    void fetchJson<GeocodingResponse>(GEOCODING, geocodingUrl(q), {
      fixture: 'geocoding-search',
    })
      .then((res) => {
        if (!cancelled) setResults(res.results ?? [])
      })
      .catch(() => {
        if (!cancelled) setResults([])
      })
    return () => {
      cancelled = true
    }
  }, [debounced])

  function select(r: GeoResult): void {
    setPoint({ lat: r.latitude, lon: r.longitude, name: r.name })
    requestFlyTo(r.latitude, r.longitude)
  }

  return (
    <Spotlight
      shortcut="mod + k"
      query={query}
      onQueryChange={setQuery}
      filter={(_q, actions) => actions}
      nothingFound="No locations found"
      searchProps={{ placeholder: 'Search locations…' }}
      actions={results.map((r) => ({
        id: String(r.id),
        label: r.name,
        description: describeResult(r),
        onClick: () => select(r),
      }))}
    />
  )
}
