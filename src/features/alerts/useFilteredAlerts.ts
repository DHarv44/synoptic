import { useEffect, useMemo } from 'react'
import { useFeatureOptions } from '@/core/settings/store'
import { acquireAlertsFeed, useAlertsData } from '@/core/data/nws/alertsFeed'
import { alertCategory, CATEGORY_SETTING, type AlertFeature } from '@/core/data/nws/alerts'
import { meetsSeverity, type SeverityLevel } from '@/core/data/nws/severity'

/**
 * Active alerts the user has asked to see. Applied once, here, so the map
 * polygons, the panel list and the collapsed summary can't disagree about
 * what is showing — a warning drawn on the map but missing from the list
 * would be worse than no filter at all.
 */
export function useFilteredAlerts(): { all: AlertFeature[]; shown: AlertFeature[] } {
  const all = useAlertsData()
  useEffect(() => acquireAlertsFeed(), [])
  const options = useFeatureOptions('alerts')

  const shown = useMemo(() => {
    const minSeverity = options.minSeverity as SeverityLevel
    return all.filter((a) => {
      if (!meetsSeverity(a.properties.severity, minSeverity)) return false
      const key = CATEGORY_SETTING[alertCategory(a.properties.event)]
      return key === null || options[key] === true
    })
  }, [all, options])

  return { all, shown }
}
