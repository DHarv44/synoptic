import { useEffect, useState } from 'react'
import { Group, Text } from '@mantine/core'

function fmtUtc(d: Date): string {
  return d.toISOString().slice(11, 19) + 'Z'
}

function fmtLocal(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

/** Dual clock, UTC-first — meteorology runs on Z time. */
export function UtcClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <Group gap="md" wrap="nowrap">
      <Text size="sm" ff="monospace" fw={600}>
        {fmtUtc(now)}
      </Text>
      <Text size="sm" ff="monospace" c="dimmed">
        {fmtLocal(now)} local
      </Text>
    </Group>
  )
}
