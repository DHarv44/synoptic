import { useState } from 'react'
import { ActionIcon, Button, Menu, Stack, Text } from '@mantine/core'
import { IconCheck, IconDeviceFloppy, IconStackFront, IconTrash } from '@tabler/icons-react'
import { BUILT_IN_PRESETS, type Preset } from '@/core/presets/presets'
import { applyPresetById, getPresetById, useActivePresetId } from '@/core/presets/store'
import { useUserPresets } from '@/core/presets/userPresets'
import { SavePresetModal } from '@/app/shell/SavePresetModal'

function PresetItem({
  preset,
  active,
  onRemove,
}: {
  preset: Preset
  active: boolean
  onRemove?: () => void
}) {
  return (
    <Menu.Item
      onClick={() => applyPresetById(preset.id)}
      rightSection={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {active && <IconCheck size={14} stroke={2} />}
          {onRemove && (
            <ActionIcon
              component="span"
              variant="subtle"
              color="gray"
              size="xs"
              aria-label={`Delete preset ${preset.label}`}
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
            >
              <IconTrash size={13} stroke={1.6} />
            </ActionIcon>
          )}
        </span>
      }
    >
      <Stack gap={0}>
        <Text size="sm">{preset.label}</Text>
        <Text size="xs" c="dimmed">
          {preset.description}
        </Text>
      </Stack>
    </Menu.Item>
  )
}

/**
 * Scene preset switcher: one tap swaps the whole layer stack for a task.
 * Built-ins are cut by job; the user's own saved scenes follow, and the
 * current stack can be saved from here.
 */
export function PresetMenu() {
  const activeId = useActivePresetId()
  const active = activeId !== null ? getPresetById(activeId) : undefined
  const userPresets = useUserPresets((s) => s.presets)
  const remove = useUserPresets((s) => s.remove)
  const [saving, setSaving] = useState(false)

  return (
    <>
      <Menu position="bottom-start" width={260} withinPortal>
        <Menu.Target>
          <Button
            variant="subtle"
            color="gray"
            size="compact-xs"
            leftSection={<IconStackFront size={15} stroke={1.6} />}
            aria-label="Scene presets"
          >
            {active?.label ?? 'Scene'}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Scene presets</Menu.Label>
          {BUILT_IN_PRESETS.map((p) => (
            <PresetItem key={p.id} preset={p} active={p.id === activeId} />
          ))}
          {userPresets.length > 0 && (
            <>
              <Menu.Divider />
              <Menu.Label>Saved scenes</Menu.Label>
              {userPresets.map((p) => (
                <PresetItem
                  key={p.id}
                  preset={p}
                  active={p.id === activeId}
                  onRemove={() => remove(p.id)}
                />
              ))}
            </>
          )}
          <Menu.Divider />
          <Menu.Item
            leftSection={<IconDeviceFloppy size={15} stroke={1.6} />}
            onClick={() => setSaving(true)}
          >
            Save current scene…
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <SavePresetModal opened={saving} onClose={() => setSaving(false)} />
    </>
  )
}
