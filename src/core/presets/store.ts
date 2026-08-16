import { useMemo } from 'react'
import { useSettings } from '@/core/settings/store'
import { BUILT_IN_PRESETS, applyPreset, getPreset, sceneMatches } from '@/core/presets/presets'

/**
 * The active preset is DERIVED, never stored: whichever preset the current
 * scene exactly matches, recomputed from settings truth. Applying one makes
 * it match; any hand-toggle makes it not; reloads need no bookkeeping. A
 * stored "last clicked" id was tried first and lied after either.
 */
export function useActivePresetId(): string | null {
  const features = useSettings((s) => s.features)
  return useMemo(() => {
    void features // recompute when any setting changes
    return BUILT_IN_PRESETS.find(sceneMatches)?.id ?? null
  }, [features])
}

export function applyPresetById(id: string): void {
  const preset = getPreset(id)
  if (preset) applyPreset(preset)
}
