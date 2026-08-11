import type { ReactNode } from 'react'
import { Text } from '@mantine/core'

/**
 * The one-line status on a collapsed dock section. Sections start collapsed,
 * so this is what makes the stack scannable — it has to answer "is there
 * anything here for me" without opening it.
 */
export function SectionHint({
  children,
  tone = 'quiet',
}: {
  children: ReactNode
  /** `alert` for counts that mean something is happening. */
  tone?: 'quiet' | 'alert'
}) {
  return (
    <Text
      size="xs"
      c={tone === 'alert' ? 'red.6' : 'dimmed'}
      fw={tone === 'alert' ? 600 : 400}
      lineClamp={1}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {children}
    </Text>
  )
}
