import { NumberInput, Select, Switch } from '@mantine/core'
import type { SettingField, SettingValue } from '@/core/settings/types'

interface SettingFieldInputProps {
  field: SettingField
  value: SettingValue
  onChange: (value: SettingValue) => void
}

/** Renders one manifest-declared setting as the right Mantine input. */
export function SettingFieldInput({ field, value, onChange }: SettingFieldInputProps) {
  switch (field.kind) {
    case 'boolean':
      return (
        <Switch
          label={field.label}
          size="xs"
          checked={value === true}
          onChange={(e) => onChange(e.currentTarget.checked)}
        />
      )
    case 'number':
      return (
        <NumberInput
          label={field.label}
          size="xs"
          min={field.min}
          max={field.max}
          step={field.step}
          value={typeof value === 'number' ? value : field.defaultValue}
          onChange={(v) => onChange(typeof v === 'number' ? v : field.defaultValue)}
        />
      )
    case 'select':
      return (
        <Select
          label={field.label}
          size="xs"
          data={[...field.options]}
          value={typeof value === 'string' ? value : field.defaultValue}
          onChange={(v) => onChange(v ?? field.defaultValue)}
          allowDeselect={false}
        />
      )
  }
}
