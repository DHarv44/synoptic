import { useEffect, useMemo } from 'react'
import { bboxIntersects, useMapView } from '@/map/viewStore'
import { acquireAlertsFeed, useAlertsData } from '@/features/alerts/store'
import { alertBbox, type AlertFeature } from '@/features/alerts/service'

export interface VisibleAlert {
  a: AlertFeature
  bbox: ReturnType<typeof alertBbox>
}

/**
 * Active alerts intersecting the viewport. Shared by the panel and its
 * collapsed summary so the two can't disagree about what "in view" means.
 */
export function useVisibleAlerts(includeUnmapped = false): {
  all: AlertFeature[]
  visible: VisibleAlert[]
} {
  const all = useAlertsData()
  const bounds = useMapView((s) => s.bounds)
  useEffect(() => acquireAlertsFeed(), [])

  const withBoxes = useMemo(() => all.map((a) => ({ a, bbox: alertBbox(a) })), [all])
  const visible = useMemo(() => {
    const mapped = withBoxes.filter(
      ({ bbox }) => bbox !== null && (bounds === null || bboxIntersects(bbox, bounds)),
    )
    return includeUnmapped
      ? [...mapped, ...withBoxes.filter(({ bbox }) => bbox === null)]
      : mapped
  }, [withBoxes, bounds, includeUnmapped])

  return { all, visible }
}
