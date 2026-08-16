import type { ReactNode } from 'react'
import { Group, Stack, Text } from '@mantine/core'

interface SettingRowProps {
  label: string
  help?: string
  /** Controls sit in a fixed right-hand column so they line up down the page. */
  control: ReactNode
  indent?: boolean
}

const CONTROL_WIDTH = 148

/** One label/control pair: text left, control right-aligned in a fixed column. */
export function SettingRow({ label, help, control, indent = false }: SettingRowProps) {
  return (
    <Group
      justify="space-between"
      align="center"
      wrap="nowrap"
      gap="sm"
      py={5}
      pl={indent ? 'sm' : 0}
    >
      <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
        <Text size="xs">{label}</Text>
        {help && (
          <Text size="xs" c="dimmed" lh={1.3}>
            {help}
          </Text>
        )}
      </Stack>
      <div style={{ width: CONTROL_WIDTH, flexShrink: 0 }}>{control}</div>
    </Group>
  )
}
