import { useMemo } from 'react'
import { bboxIntersects, useMapView } from '@/map/viewStore'
import { useFilteredAlerts } from '@/features/alerts/useFilteredAlerts'
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
  /** Everything active, before the user's filters. */
  all: AlertFeature[]
  /** Passing the filters, before the viewport. */
  shown: AlertFeature[]
  visible: VisibleAlert[]
} {
  const { all, shown } = useFilteredAlerts()
  const bounds = useMapView((s) => s.bounds)

  const withBoxes = useMemo(() => shown.map((a) => ({ a, bbox: alertBbox(a) })), [shown])
  const visible = useMemo(() => {
    const mapped = withBoxes.filter(
      ({ bbox }) => bbox !== null && (bounds === null || bboxIntersects(bbox, bounds)),
    )
    return includeUnmapped
      ? [...mapped, ...withBoxes.filter(({ bbox }) => bbox === null)]
      : mapped
  }, [withBoxes, bounds, includeUnmapped])

  return { all, shown, visible }
}
