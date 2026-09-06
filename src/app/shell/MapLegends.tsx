import { Stack } from '@mantine/core'
import { listFeatures } from '@/core/settings/registry'
import { useFeatureEnabled } from '@/core/settings/store'
import { useAvailableTools } from '@/app/shell/toolRegistry'
import { RAIL_WIDTH } from '@/app/shell/ToolRail'
import { TAB_BAR_HEIGHT } from '@/app/shell/MobileSheet'
import type { FeatureManifest } from '@/core/settings/types'

function FeatureLegend({ manifest }: { manifest: FeatureManifest }) {
  const enabled = useFeatureEnabled(manifest.id)
  const Legend = manifest.legendComponent
  if (!enabled || !Legend) return null
  return <Legend />
}

/**
 * Every enabled feature's colour key, stacked above the playback bar in the
 * bottom-left — a real workstation never shows a colour field without its
 * bar. On mobile the stack sits beside the control column, so keys wrap
 * rather than run under it.
 */
export function MapLegends({ isMobile }: { isMobile: boolean }) {
  const railVisible = useAvailableTools().length > 0 && !isMobile
  const legends = listFeatures().filter((f) => f.legendComponent)
  if (legends.length === 0) return null
  return (
    <Stack
      gap={6}
      align="flex-start"
      style={{
        position: 'absolute',
        left: railVisible ? RAIL_WIDTH + 15 : 15,
        // Clear the playback bar (desktop) or the tab bar + playback bar (mobile).
        bottom: isMobile ? TAB_BAR_HEIGHT + 70 : 74,
        // Mobile: stop short of the 44 px control column on the right.
        maxWidth: isMobile ? 'calc(100% - 15px - 68px)' : undefined,
        zIndex: 4,
        pointerEvents: 'none',
      }}
    >
      {legends.map((f) => (
        <FeatureLegend key={f.id} manifest={f} />
      ))}
    </Stack>
  )
}
