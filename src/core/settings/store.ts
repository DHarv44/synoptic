import { useMemo } from 'react'
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
  /** Drop a feature's overrides so it falls back to manifest defaults. */
  resetFeature: (id: string) => void
  resetAll: () => void
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
      resetFeature: (id) =>
        set((s) => {
          const next = { ...s.features }
          delete next[id]
          return { features: next }
        }),
      resetAll: () => set({ features: {} }),
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

/**
 * Every option for a feature, manifest defaults filled in. For readers that
 * need several at once — subscribing per key works, but restating the
 * defaults alongside the manifest to do it does not.
 */
export function useFeatureOptions(id: string): Record<string, SettingValue> {
  const stored = useSettings((s) => s.features[id]?.options)
  return useMemo(() => ({ ...defaultsFor(id).options, ...stored }), [id, stored])
}

/** Non-hook accessor for services/workers. */
export function featureEnabled(id: string): boolean {
  const s = useSettings.getState()
  return s.features[id]?.enabled ?? defaultsFor(id).enabled
}

/** Non-hook option read, for services outside the React tree. */
export function featureOption<T extends SettingValue>(id: string, key: string): T {
  const s = useSettings.getState()
  return (s.features[id]?.options[key] ?? defaultsFor(id).options[key]) as T
}

attachDevStore('settings', useSettings)
