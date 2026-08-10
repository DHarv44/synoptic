import { useEffect, useState } from 'react'
import { Group, Text } from '@mantine/core'
import { fmtLocalTime, fmtUtcTime } from '@/core/time/format'

/** Dual clock, UTC-first — meteorology runs on Z time. */
export function UtcClock() {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <Group gap="md" wrap="nowrap">
      <Text size="sm" ff="monospace" fw={600}>
        {fmtUtcTime(now)}
      </Text>
      <Text size="sm" ff="monospace" c="dimmed">
        {fmtLocalTime(now)} local
      </Text>
    </Group>
  )
}
