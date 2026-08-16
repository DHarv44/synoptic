import { create } from 'zustand'
import { useSettings } from '@/core/settings/store'
import { applyPreset, getPreset } from '@/core/presets/presets'

interface PresetState {
  /** The preset whose scene is currently on screen, until the user departs it. */
  activeId: string | null
  apply: (id: string) => void
}

let applying = false

export const usePresets = create<PresetState>((set) => ({
  activeId: null,
  apply: (id) => {
    const preset = getPreset(id)
    if (!preset) return
    applying = true
    try {
      applyPreset(preset)
    } finally {
      applying = false
    }
    set({ activeId: id })
  },
}))

// Hand-toggling any layer or option means the scene is no longer the preset's;
// drop the highlight rather than pretend. Preset application itself is exempt.
useSettings.subscribe((s, prev) => {
  if (!applying && s.features !== prev.features && usePresets.getState().activeId !== null) {
    usePresets.setState({ activeId: null })
  }
})
