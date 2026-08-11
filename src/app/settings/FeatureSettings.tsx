import { Anchor, Collapse, Group, Stack, Switch, Text } from '@mantine/core'
import { useSettings, useFeatureEnabled } from '@/core/settings/store'
import type { FeatureManifest } from '@/core/settings/types'
import { SettingRow } from '@/app/settings/SettingRow'
import { SettingFieldInput } from '@/app/settings/SettingFieldInput'

/**
 * One feature's block: a title row carrying the enable switch, its options
 * indented beneath. Hairline-separated rather than boxed — nested card
 * borders make a settings list harder to scan, not easier.
 */
export function FeatureSettings({ manifest }: { manifest: FeatureManifest }) {
  const enabled = useFeatureEnabled(manifest.id)
  const options = useSettings((s) => s.features[manifest.id]?.options)
  const setEnabled = useSettings((s) => s.setEnabled)
  const setOption = useSettings((s) => s.setOption)
  const resetFeature = useSettings((s) => s.resetFeature)

  const active = enabled || manifest.alwaysOn === true
  const isDirty = options !== undefined && Object.keys(options).length > 0

  return (
    <Stack
      gap={0}
      py={6}
      style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
        <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
          <Group gap={6} wrap="nowrap">
            <Text size="xs" fw={600}>
              {manifest.title}
            </Text>
            {isDirty && (
              <Anchor
                component="button"
                type="button"
                size="xs"
                c="dimmed"
                onClick={() => resetFeature(manifest.id)}
              >
                reset
              </Anchor>
            )}
          </Group>
          <Text size="xs" c="dimmed" lh={1.3}>
            {manifest.description}
          </Text>
        </Stack>
        {!manifest.alwaysOn && (
          <Switch
            size="xs"
            checked={enabled}
            onChange={(e) => setEnabled(manifest.id, e.currentTarget.checked)}
            aria-label={`Enable ${manifest.title}`}
            style={{ marginTop: 2 }}
          />
        )}
      </Group>
      <Collapse expanded={active && manifest.settings.length > 0}>
        <Stack gap={0} mt={4}>
          {manifest.settings.map((field) => (
            <SettingRow
              key={field.key}
              label={field.label}
              indent
              control={
                <SettingFieldInput
                  field={field}
                  value={options?.[field.key] ?? field.defaultValue}
                  onChange={(v) => setOption(manifest.id, field.key, v)}
                />
              }
            />
          ))}
        </Stack>
      </Collapse>
    </Stack>
  )
}
