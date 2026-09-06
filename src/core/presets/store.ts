import { useMemo } from 'react'
import { useSettings } from '@/core/settings/store'
import { applyPreset, sceneMatches, type Preset } from '@/core/presets/presets'
import { allPresets, useUserPresets } from '@/core/presets/userPresets'

/**
 * The active preset is DERIVED, never stored: whichever preset the current
 * scene exactly matches, recomputed from settings truth. Applying one makes
 * it match; any hand-toggle makes it not; reloads need no bookkeeping. A
 * stored "last clicked" id was tried first and lied after either.
 */
export function useActivePresetId(): string | null {
  const features = useSettings((s) => s.features)
  const userPresets = useUserPresets((s) => s.presets)
  return useMemo(() => {
    void features // recompute when any setting changes
    void userPresets
    return allPresets().find(sceneMatches)?.id ?? null
  }, [features, userPresets])
}

export function getPresetById(id: string): Preset | undefined {
  return allPresets().find((p) => p.id === id)
}

export function applyPresetById(id: string): void {
  const preset = getPresetById(id)
  if (preset) applyPreset(preset)
}

/**
 * Save the scene under a name, then apply it. Applying what was just
 * captured changes nothing visible — it only resets the hidden options of
 * layers that are off, which is what makes the scene match its new preset
 * exactly, so the chip lights up as soon as you save.
 */
export function saveScenePreset(label: string): Preset {
  const preset = useUserPresets.getState().save(label)
  applyPreset(preset)
  return preset
}
