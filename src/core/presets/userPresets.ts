import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { featureEnabled, featureOption } from '@/core/settings/store'
import { getFeature } from '@/core/settings/registry'
import type { SettingValue } from '@/core/settings/types'
import {
  BUILT_IN_PRESETS,
  SCENE_FEATURES,
  type Preset,
  type SceneSpec,
} from '@/core/presets/presets'

/**
 * The current scene as a preset spec — the same minimal shape the built-ins
 * use: enabled features only, and for each only the options that differ
 * from manifest defaults, so a saved preset reads like a hand-written one.
 * This is an AWIPS procedure: the layer stack you built, kept by name.
 */
export function captureScene(): SceneSpec {
  const scene: SceneSpec = {}
  for (const id of SCENE_FEATURES) {
    if (!featureEnabled(id)) continue
    const overrides: Record<string, SettingValue> = {}
    for (const field of getFeature(id)?.settings ?? []) {
      const value = featureOption(id, field.key)
      if (value !== field.defaultValue) overrides[field.key] = value
    }
    scene[id] = Object.keys(overrides).length === 0 ? true : overrides
  }
  return scene
}

interface UserPresetsState {
  presets: Preset[]
  save: (label: string) => Preset
  remove: (id: string) => void
}

export const useUserPresets = create<UserPresetsState>()(
  persist(
    (set) => ({
      presets: [],
      save: (label) => {
        // Time alone collided when two saves landed in one millisecond
        // (and deleting one then deleted both); the random tail makes ids
        // distinct without needing a persisted counter.
        const preset: Preset = {
          id: `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
          label: label.trim(),
          description: 'Saved scene',
          scene: captureScene(),
        }
        set((s) => ({ presets: [...s.presets, preset] }))
        return preset
      },
      remove: (id) => set((s) => ({ presets: s.presets.filter((p) => p.id !== id) })),
    }),
    { name: 'synoptic.presets', version: 1 },
  ),
)

/** Built-ins first, then the user's own — one list for lookup and matching. */
export function allPresets(): Preset[] {
  return [...BUILT_IN_PRESETS, ...useUserPresets.getState().presets]
}
