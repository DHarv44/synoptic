import { useState } from 'react'
import { Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core'
import { saveScenePreset } from '@/core/presets/store'

/** Name the current layer stack and keep it as a preset. */
export function SavePresetModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const [label, setLabel] = useState('')
  const valid = label.trim().length > 0

  const submit = (): void => {
    if (!valid) return
    saveScenePreset(label)
    setLabel('')
    onClose()
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Save scene as preset" size="sm" centered>
      <Stack gap="sm">
        <Text size="xs" c="dimmed">
          Keeps the layers that are on right now, with their products and opacities, under a
          name in the scene menu.
        </Text>
        <TextInput
          data-autofocus
          label="Name"
          placeholder="e.g. Gulf hurricane watch"
          value={label}
          onChange={(e) => setLabel(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
        />
        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" color="gray" size="xs" onClick={onClose}>
            Cancel
          </Button>
          <Button size="xs" onClick={submit} disabled={!valid}>
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
