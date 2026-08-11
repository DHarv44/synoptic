import { useEffect, useMemo } from 'react'
import { bboxIntersects, useMapView } from '@/map/viewStore'
import { acquireCellsFeed, useCellsData } from '@/features/cells/store'
import type { CellFeature } from '@/features/cells/service'

/**
 * Storm cells inside the viewport. Shared by the panel and its collapsed
 * summary so both count the same thing.
 */
export function useVisibleCells(): { all: CellFeature[]; visible: CellFeature[] } {
  const all = useCellsData()
  const bounds = useMapView((s) => s.bounds)
  useEffect(() => acquireCellsFeed(), [])

  const visible = useMemo(() => {
    if (!bounds) return all
    return all.filter((c) => {
      const [lon, lat] = c.geometry.coordinates
      return bboxIntersects([lon, lat, lon, lat], bounds)
    })
  }, [all, bounds])

  return { all, visible }
}
