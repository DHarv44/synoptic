import { useEffect, useState } from 'react'
import { Group, Text } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { fmtLocalTime, fmtUtcTime } from '@/core/time/format'

/** Dual clock, UTC-first — meteorology runs on Z time. UTC only on mobile. */
export function UtcClock() {
  const [now, setNow] = useState(() => Date.now())
  const isMobile = useMediaQuery('(max-width: 48em)') ?? false

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <Group gap="md" wrap="nowrap" style={{ flexShrink: 0 }}>
      <Text size="sm" ff="monospace" fw={600}>
        {fmtUtcTime(now)}
      </Text>
      {!isMobile && (
        <Text size="sm" ff="monospace" c="dimmed">
          {fmtLocalTime(now)} local
        </Text>
      )}
    </Group>
  )
}
