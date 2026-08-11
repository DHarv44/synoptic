import { useEffect, useState } from 'react'
import { Group, Text } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { fmtLocalTime, fmtUtcTime, zoneLabel } from '@/core/time/format'
import { useTimeFormat } from '@/core/time/useTimeFormat'

/**
 * Clock in the user's chosen zone, with the other zone alongside on wide
 * screens — forecasters work in UTC, everyone else in local, and comparing
 * the two is common enough to keep both visible when there's room.
 */
export function Clock() {
  const [now, setNow] = useState(() => Date.now())
  const isMobile = useMediaQuery('(max-width: 48em)') ?? false
  const { zone } = useTimeFormat()

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const utcFirst = zone === 'utc'
  const primary = utcFirst ? fmtUtcTime(now) : fmtLocalTime(now)
  const secondary = utcFirst ? fmtLocalTime(now) : fmtUtcTime(now)
  const secondaryLabel = utcFirst ? zoneLabel(false) : ''

  return (
    <Group gap="md" wrap="nowrap" style={{ flexShrink: 0 }}>
      <Text size="sm" ff="monospace" fw={600}>
        {primary}
      </Text>
      {!isMobile && (
        <Text size="sm" ff="monospace" c="dimmed">
          {secondary} {secondaryLabel}
        </Text>
      )}
    </Group>
  )
}
