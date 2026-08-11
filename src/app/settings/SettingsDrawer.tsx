import { useState } from 'react'
import { Drawer, Stack, Text, TextInput } from '@mantine/core'
import { listFeatures } from '@/core/settings/registry'
import { FeatureCard } from '@/app/settings/FeatureCard'
import type { FeatureManifest } from '@/core/settings/types'

interface SettingsDrawerProps {
  opened: boolean
  onClose: () => void
}

const SECTIONS: Array<{ label: string; match: (f: FeatureManifest) => boolean }> = [
  { label: 'Layers', match: (f) => f.layer === true },
  { label: 'Analysis', match: (f) => f.layer !== true && (f.panels?.length ?? 0) > 0 },
  { label: 'General', match: (f) => f.layer !== true && (f.panels?.length ?? 0) === 0 },
]

/**
 * Settings drawer, generated from the feature registry. Layer visibility
 * lives on the map; everything durable — opacity, colour tables, products,
 * units — lives here.
 */
export function SettingsDrawer({ opened, onClose }: SettingsDrawerProps) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const matches = (f: FeatureManifest): boolean =>
    q === '' || f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)

  const features = listFeatures().filter(matches)

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={400}
      title="Settings"
      overlayProps={{ backgroundOpacity: 0.35, blur: 2 }}
    >
      <Stack gap="sm">
        <TextInput
          placeholder="Search settings…"
          size="xs"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          data-autofocus
        />
        {SECTIONS.map(({ label, match }) => {
          const group = features.filter(match)
          if (group.length === 0) return null
          return (
            <Stack key={label} gap="xs">
              <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
                {label}
              </Text>
              {group.map((f) => (
                <FeatureCard key={f.id} manifest={f} />
              ))}
            </Stack>
          )
        })}
        {features.length === 0 && (
          <Text size="xs" c="dimmed">
            Nothing matches “{query}”.
          </Text>
        )}
      </Stack>
    </Drawer>
  )
}
