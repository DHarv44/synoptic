import { listFeatures } from '@/core/settings/registry'
import { featureEnabled } from '@/core/settings/store'
import { SYNC_LAG_CAP_MS } from '@/core/time/timelineStore'

/**
 * The SYNC loop's hold-back: the largest publication lag among enabled
 * layers that declare animation timing. Layers whose current settings make
 * them non-animating return null and don't drag the window; anything over
 * the cap is a broken feed, not a coherence trade, and is ignored the same
 * way. With nothing declaring, the answer is 0 and SYNC degrades to LIVE.
 */
export function computeSyncLag(): number {
  let max = 0
  for (const f of listFeatures()) {
    if (f.timeMeta === undefined || !featureEnabled(f.id)) continue
    const meta = f.timeMeta()
    if (meta !== null && meta.lagMs <= SYNC_LAG_CAP_MS) max = Math.max(max, meta.lagMs)
  }
  return max
}
