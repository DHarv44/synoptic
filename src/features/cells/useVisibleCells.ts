import { useEffect, useMemo } from 'react'
import { bboxIntersects, useMapView } from '@/map/viewStore'
import { useFeatureOption } from '@/core/settings/store'
import { acquireCellsFeed, useCellsData } from '@/features/cells/store'
import { cellSeverity, type CellFeature } from '@/features/cells/service'

/**
 * Storm cells, at three stages. The map layer wants `shown` — filtered by
 * the severity setting but not the viewport, since MapLibre culls off-screen
 * points itself and rebuilding the source on every pan would be wasteful.
 * The panel and its summary want `visible`, which is what's actually on
 * screen. Everything reads from here so the map and the list agree.
 */
export function useVisibleCells(): {
  all: CellFeature[]
  shown: CellFeature[]
  visible: CellFeature[]
} {
  const all = useCellsData()
  const bounds = useMapView((s) => s.bounds)
  const minSeverity = Number(useFeatureOption<string>('cells', 'minSeverity'))
  useEffect(() => acquireCellsFeed(), [])

  const shown = useMemo(
    () => all.filter((c) => cellSeverity(c.properties) >= minSeverity),
    [all, minSeverity],
  )

  const visible = useMemo(() => {
    if (!bounds) return shown
    return shown.filter((c) => {
      const [lon, lat] = c.geometry.coordinates
      return bboxIntersects([lon, lat, lon, lat], bounds)
    })
  }, [shown, bounds])

  return { all, shown, visible }
}
