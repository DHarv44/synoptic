import { useState } from 'react'
import { Modal, Stack, Text, TextInput } from '@mantine/core'
import { listFeatures } from '@/core/settings/registry'
import { FeatureCard } from '@/app/settings/FeatureCard'

interface SettingsModalProps {
  opened: boolean
  onClose: () => void
}

/**
 * The settings screen, generated entirely from the feature registry —
 * a new feature gets its toggles here for free (PLAN.md §3.13a).
 */
export function SettingsModal({ opened, onClose }: SettingsModalProps) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const features = listFeatures().filter(
    (f) =>
      q === '' ||
      f.title.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q),
  )

  return (
    <Modal opened={opened} onClose={onClose} title="Settings" size="lg">
      <Stack gap="sm">
        <TextInput
          placeholder="Search features…"
          size="xs"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          data-autofocus
        />
        {features.map((f) => (
          <FeatureCard key={f.id} manifest={f} />
        ))}
        {features.length === 0 && (
          <Text size="xs" c="dimmed">
            No features match “{query}”.
          </Text>
        )}
      </Stack>
    </Modal>
  )
}
