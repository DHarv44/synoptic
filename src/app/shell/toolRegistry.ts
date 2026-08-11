import { listFeatures } from '@/core/settings/registry'
import { useSettings } from '@/core/settings/store'
import { useTools } from '@/app/shell/toolStore'
import type { ToolContribution } from '@/core/settings/types'

/** Tools contributed by currently enabled features. */
export function useAvailableTools(): ToolContribution[] {
  const featureStates = useSettings((s) => s.features)
  return listFeatures()
    .filter((f) => featureStates[f.id]?.enabled ?? f.defaultEnabled ?? true)
    .flatMap((f) => f.tools ?? [])
}

/**
 * The open workbench, or null. Availability is derived rather than stored,
 * so disabling the feature behind a tool closes its panel — the selection
 * itself is kept, so re-enabling the feature brings the panel back.
 *
 * Everything that lays out or renders the panel must agree on this: the
 * shell sizing the navbar from a stale id left a 40% empty column beside
 * the map after Level 2 was switched off.
 */
export function useActiveTool(): ToolContribution | null {
  const active = useTools((s) => s.active)
  const tools = useAvailableTools()
  return tools.find((t) => t.id === active) ?? null
}
