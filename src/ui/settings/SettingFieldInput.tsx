import { Group, NumberInput, Select, Slider, Switch, Text } from '@mantine/core'
import type { SettingField, SettingValue } from '@/core/settings/types'

interface SettingFieldInputProps {
  field: SettingField
  value: SettingValue
  onChange: (value: SettingValue) => void
  /**
   * Render select dropdowns inline rather than portaled. Inside a
   * hover-opened popover a portaled dropdown lands outside the hover
   * area, and pointing at it closes the popover under your cursor.
   */
  selectWithinPortal?: boolean
}

/** Wide numeric ranges read better as sliders than as spinners. */
function isContinuous(field: Extract<SettingField, { kind: 'number' }>): boolean {
  return (field.max - field.min) / (field.step ?? 1) > 8
}

/** Renders one manifest-declared setting as the right Mantine control. */
export function SettingFieldInput({
  field,
  value,
  onChange,
  selectWithinPortal = true,
}: SettingFieldInputProps) {
  switch (field.kind) {
    case 'boolean':
      return (
        <Group justify="flex-end">
          <Switch
            size="xs"
            checked={value === true}
            onChange={(e) => onChange(e.currentTarget.checked)}
            aria-label={field.label}
          />
        </Group>
      )
    case 'number': {
      const current = typeof value === 'number' ? value : field.defaultValue
      if (!isContinuous(field)) {
        return (
          <NumberInput
            size="xs"
            min={field.min}
            max={field.max}
            step={field.step}
            value={current}
            onChange={(v) => onChange(typeof v === 'number' ? v : field.defaultValue)}
            aria-label={field.label}
          />
        )
      }
      return (
        <Group gap="xs" wrap="nowrap">
          <Slider
            flex={1}
            size="xs"
            min={field.min}
            max={field.max}
            step={field.step}
            value={current}
            onChange={(v) => onChange(v)}
            label={null}
            aria-label={field.label}
          />
          <Text size="xs" ff="monospace" c="dimmed" w={26} ta="right">
            {current}
          </Text>
        </Group>
      )
    }
    case 'select':
      return (
        <Select
          size="xs"
          data={[...field.options]}
          value={typeof value === 'string' ? value : field.defaultValue}
          onChange={(v) => onChange(v ?? field.defaultValue)}
          allowDeselect={false}
          aria-label={field.label}
          comboboxProps={{ withinPortal: selectWithinPortal }}
        />
      )
  }
}
