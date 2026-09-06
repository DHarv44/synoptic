import { create } from 'zustand'
import { resolveAlertZones } from '@/core/data/nws/zones'
import type { AlertFeature } from '@/core/data/nws/alerts'

interface ZoneState {
  /** Alert id → resolved zone geometry. */
  resolved: Record<string, GeoJSON.GeometryCollection>
  /** Alert id → fetch progress while zones are loading. */
  pending: Record<string, { done: number; total: number }>
  /** Alert id → why the last attempt failed. */
  failed: Record<string, string>
  resolve: (alert: AlertFeature) => Promise<GeoJSON.GeometryCollection | null>
}

/**
 * Session memory of which zone alerts have been outlined. Not persisted:
 * alerts expire in hours, and the zone geometry underneath is cached in
 * IndexedDB for two weeks anyway, so re-resolving is cheap.
 */
export const useZoneAlerts = create<ZoneState>((set, get) => ({
  resolved: {},
  pending: {},
  failed: {},
  resolve: async (alert) => {
    const id = alert.id
    const have = get().resolved[id]
    if (have) return have
    if (get().pending[id]) return null
    const total = alert.properties.affectedZones?.length ?? 0
    set((s) => ({
      pending: { ...s.pending, [id]: { done: 0, total } },
      failed: Object.fromEntries(Object.entries(s.failed).filter(([k]) => k !== id)),
    }))
    try {
      const geometry = await resolveAlertZones(alert, (done) =>
        set((s) => ({ pending: { ...s.pending, [id]: { done, total } } })),
      )
      set((s) => ({
        resolved: { ...s.resolved, [id]: geometry },
        pending: Object.fromEntries(Object.entries(s.pending).filter(([k]) => k !== id)),
      }))
      return geometry
    } catch (e) {
      set((s) => ({
        pending: Object.fromEntries(Object.entries(s.pending).filter(([k]) => k !== id)),
        failed: { ...s.failed, [id]: e instanceof Error ? e.message : String(e) },
      }))
      return null
    }
  },
}))

/** Alerts with resolved zone geometry attached; the rest pass through. */
export function attachZones(
  alerts: AlertFeature[],
  resolved: Record<string, GeoJSON.GeometryCollection>,
): AlertFeature[] {
  return alerts.map((a) =>
    a.geometry === null && resolved[a.id]
      ? { ...a, geometry: resolved[a.id], zoneResolved: true }
      : a,
  )
}
