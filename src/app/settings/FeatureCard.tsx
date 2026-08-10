import { Group, Paper, Stack, Switch, Text } from '@mantine/core'
import { useSettings, useFeatureEnabled } from '@/core/settings/store'
import type { FeatureManifest } from '@/core/settings/types'
import { SettingFieldInput } from '@/app/settings/SettingFieldInput'

interface FeatureCardProps {
  manifest: FeatureManifest
}

/** One feature's settings block: enable switch + its declared options. */
export function FeatureCard({ manifest }: FeatureCardProps) {
  const enabled = useFeatureEnabled(manifest.id)
  const options = useSettings((s) => s.features[manifest.id]?.options)
  const setEnabled = useSettings((s) => s.setEnabled)
  const setOption = useSettings((s) => s.setOption)

  return (
    <Paper withBorder p="sm" radius="sm">
      <Group justify="space-between" wrap="nowrap">
        <div>
          <Text size="sm" fw={600}>
            {manifest.title}
          </Text>
          <Text size="xs" c="dimmed">
            {manifest.description}
          </Text>
        </div>
        <Switch
          checked={enabled}
          onChange={(e) => setEnabled(manifest.id, e.currentTarget.checked)}
          aria-label={`Enable ${manifest.title}`}
        />
      </Group>
      {enabled && manifest.settings.length > 0 && (
        <Stack gap="xs" mt="sm">
          {manifest.settings.map((field) => (
            <SettingFieldInput
              key={field.key}
              field={field}
              value={options?.[field.key] ?? field.defaultValue}
              onChange={(v) => setOption(manifest.id, field.key, v)}
            />
          ))}
        </Stack>
      )}
    </Paper>
  )
}
