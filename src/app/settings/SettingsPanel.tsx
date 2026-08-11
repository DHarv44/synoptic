import { useState } from 'react'
import { Anchor, Box, Group, Stack, Text, TextInput } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import { listFeatures } from '@/core/settings/registry'
import { useSettings } from '@/core/settings/store'
import { FeatureSettings } from '@/app/settings/FeatureSettings'
import type { FeatureManifest } from '@/core/settings/types'

const SECTIONS: Array<{ label: string; match: (f: FeatureManifest) => boolean }> = [
  { label: 'General', match: (f) => f.alwaysOn === true },
  { label: 'Map layers', match: (f) => f.layer === true },
  {
    label: 'Analysis',
    match: (f) => f.alwaysOn !== true && f.layer !== true && (f.panels?.length ?? 0) > 0,
  },
]

/** Whether a feature matches the search query, including its option labels. */
function matches(f: FeatureManifest, q: string): boolean {
  if (q === '') return true
  return (
    f.title.toLowerCase().includes(q) ||
    f.description.toLowerCase().includes(q) ||
    f.settings.some((s) => s.label.toLowerCase().includes(q))
  )
}

/**
 * Settings, generated from the feature registry. Layer *visibility* lives
 * on the map — this is for durable preferences: opacity, colour tables,
 * products, units, interface.
 */
export function SettingsPanel() {
  const [query, setQuery] = useState('')
  const resetAll = useSettings((s) => s.resetAll)
  const dirty = useSettings((s) => Object.keys(s.features).length > 0)
  const q = query.trim().toLowerCase()
  const features = listFeatures().filter((f) => matches(f, q))

  return (
    <Stack gap={0}>
      <Box
        pb="xs"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          background: 'var(--mantine-color-body)',
        }}
      >
        <TextInput
          placeholder="Search settings…"
          size="xs"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          leftSection={<IconSearch size={14} stroke={1.6} />}
        />
      </Box>

      {SECTIONS.map(({ label, match }) => {
        const group = features.filter(match)
        if (group.length === 0) return null
        return (
          <Stack key={label} gap={0} mb="sm">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase" lts={0.8} mt="xs" mb={2}>
              {label}
            </Text>
            {group.map((f) => (
              <FeatureSettings key={f.id} manifest={f} />
            ))}
          </Stack>
        )
      })}

      {features.length === 0 && (
        <Text size="xs" c="dimmed" py="sm">
          Nothing matches “{query}”.
        </Text>
      )}

      {dirty && q === '' && (
        <Group
          justify="space-between"
          py="xs"
          style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
        >
          <Text size="xs" c="dimmed">
            Preferences are saved on this device.
          </Text>
          <Anchor component="button" type="button" size="xs" c="dimmed" onClick={resetAll}>
            Reset all
          </Anchor>
        </Group>
      )}
    </Stack>
  )
}
