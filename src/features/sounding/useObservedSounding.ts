import { useCachedFetch } from '@/core/data/useCachedFetch'
import { useProbe } from '@/core/probe/store'
import { useTimeline } from '@/core/time/timelineStore'
import {
  SYNOPTIC_MS,
  fetchRaob,
  fetchRaobStations,
  nearestStation,
  synopticTimeMs,
  toSounding,
  type RaobStation,
} from '@/core/data/iem/raob'
import type { Sounding } from '@/core/data/openMeteo/sounding'

/** Beyond this, a balloon stops being representative of the probe point. */
const MAX_STATION_KM = 400
const STATIONS_TTL_MS = 24 * 3_600_000
/** Archived profiles are immutable; the TTL only bounds late-arriving launches. */
const PROFILE_TTL_MS = 6 * 3_600_000

export interface ObservedSounding {
  sounding: Sounding
  stationId: string
  distanceKm: number
}

/**
 * Observed 00Z/12Z balloon sounding from the RAOB station nearest the probe
 * point, at the synoptic time preceding the timeline hour. Null while loading,
 * when disabled, or when no station is close enough.
 */
export function useObservedSounding(enabled: boolean): ObservedSounding | null {
  const point = useProbe((s) => s.point)
  const simTime = useTimeline((s) => s.simTime)

  const { data: stations } = useCachedFetch<RaobStation[]>(
    enabled ? 'raob-stations' : null,
    STATIONS_TTL_MS,
    fetchRaobStations,
  )

  const near = point && stations ? nearestStation(stations, point.lat, point.lon) : null
  const usable = near !== null && near.distanceKm <= MAX_STATION_KM ? near : null
  const sid = usable?.station.id ?? null
  const ts = synopticTimeMs(simTime, Date.now())

  const { data: sounding } = useCachedFetch<Sounding | null>(
    enabled && sid !== null ? `raob:${sid}:${ts}` : null,
    PROFILE_TTL_MS,
    async () => {
      if (sid === null) return null
      const first = toSounding(await fetchRaob(ts, sid))
      if (first) return first
      // Missed or late launch: fall back one synoptic cycle.
      return toSounding(await fetchRaob(ts - SYNOPTIC_MS, sid))
    },
  )

  if (!enabled || sounding == null || usable === null) return null
  return { sounding, stationId: usable.station.id, distanceKm: usable.distanceKm }
}
