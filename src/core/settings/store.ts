import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getFeature } from '@/core/settings/registry'
import type { SettingValue } from '@/core/settings/types'
import { attachDevStore } from '@/dev/wx'

export interface FeatureState {
  enabled: boolean
  options: Record<string, SettingValue>
}

interface SettingsState {
  features: Record<string, FeatureState>
  setEnabled: (id: string, enabled: boolean) => void
  setOption: (id: string, key: string, value: SettingValue) => void
}

function defaultsFor(id: string): FeatureState {
  const manifest = getFeature(id)
  const options: Record<string, SettingValue> = {}
  for (const field of manifest?.settings ?? []) {
    options[field.key] = field.defaultValue
  }
  return { enabled: manifest?.defaultEnabled ?? true, options }
}

function stateFor(features: Record<string, FeatureState>, id: string): FeatureState {
  return features[id] ?? defaultsFor(id)
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      features: {},
      setEnabled: (id, enabled) =>
        set((s) => ({
          features: { ...s.features, [id]: { ...stateFor(s.features, id), enabled } },
        })),
      setOption: (id, key, value) =>
        set((s) => {
          const cur = stateFor(s.features, id)
          return {
            features: {
              ...s.features,
              [id]: { ...cur, options: { ...cur.options, [key]: value } },
            },
          }
        }),
    }),
    { name: 'synoptic.settings', version: 1 },
  ),
)

export function useFeatureEnabled(id: string): boolean {
  return useSettings((s) => s.features[id]?.enabled ?? defaultsFor(id).enabled)
}

export function useFeatureOption<T extends SettingValue>(id: string, key: string): T {
  return useSettings(
    (s) => (s.features[id]?.options[key] ?? defaultsFor(id).options[key]) as T,
  )
}

/** Non-hook accessor for services/workers. */
export function featureEnabled(id: string): boolean {
  const s = useSettings.getState()
  return s.features[id]?.enabled ?? defaultsFor(id).enabled
}

attachDevStore('settings', useSettings)
