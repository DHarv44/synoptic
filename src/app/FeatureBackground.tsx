import { listFeatures } from '@/core/settings/registry'
import { useFeatureEnabled } from '@/core/settings/store'
import type { FeatureManifest } from '@/core/settings/types'

function One({ manifest }: { manifest: FeatureManifest }) {
  const enabled = useFeatureEnabled(manifest.id)
  const Background = manifest.backgroundComponent
  if (!enabled || !Background) return null
  return <Background />
}

/**
 * Mounts every feature's background worker for as long as that feature is
 * enabled. Lives above the shell so it doesn't depend on the map, a panel
 * being open, or which tab is showing.
 */
export function FeatureBackground() {
  return (
    <>
      {listFeatures()
        .filter((f) => f.backgroundComponent)
        .map((f) => (
          <One key={f.id} manifest={f} />
        ))}
    </>
  )
}
