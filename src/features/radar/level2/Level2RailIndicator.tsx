import { useRadar } from '@/features/radar/level2/store'
import { RailIndicator } from '@/ui/RailIndicator'

/**
 * Marks the Radar tab while a site is attached. With no controls on the map
 * any more, this is the only sign that single-site radar went live — so it
 * has to be noticeable without being an alert.
 */
export function Level2RailIndicator() {
  const site = useRadar((s) => s.site)
  return site ? <RailIndicator /> : null
}
