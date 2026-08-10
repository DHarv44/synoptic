import { Stack, Switch, Text } from '@mantine/core'
import { listFeatures } from '@/core/settings/registry'
import { useSettings, useFeatureEnabled } from '@/core/settings/store'
import type { FeatureManifest } from '@/core/settings/types'

function RailEntry({ manifest }: { manifest: FeatureManifest }) {
  const enabled = useFeatureEnabled(manifest.id)
  const setEnabled = useSettings((s) => s.setEnabled)

  return (
    <Switch
      size="xs"
      label={manifest.title}
      checked={enabled}
      onChange={(e) => setEnabled(manifest.id, e.currentTarget.checked)}
    />
  )
}

/** Layer stack (left rail): every registered layer-contributing feature. */
export function LayerRail() {
  const layers = listFeatures().filter((f) => f.layer)

  return (
    <Stack p="sm" gap="xs">
      <Text size="xs" tt="uppercase" c="dimmed" fw={600} lts={1}>
        Layers
      </Text>
      {layers.map((f) => (
        <RailEntry key={f.id} manifest={f} />
      ))}
      {layers.length === 0 && (
        <Text size="xs" c="dimmed">
          No layers registered yet.
        </Text>
      )}
    </Stack>
  )
}
