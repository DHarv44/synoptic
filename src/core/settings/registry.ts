import type { FeatureManifest, SettingField } from '@/core/settings/types'

const features = new Map<string, FeatureManifest>()

export function registerFeature(manifest: FeatureManifest): void {
  if (features.has(manifest.id)) {
    throw new Error(`duplicate feature id: ${manifest.id}`)
  }
  features.set(manifest.id, manifest)
}

export function listFeatures(): FeatureManifest[] {
  return [...features.values()]
}

export function getFeature(id: string): FeatureManifest | undefined {
  return features.get(id)
}

export function getSettingField(id: string, key: string): SettingField | undefined {
  return getFeature(id)?.settings.find((f) => f.key === key)
}
