import { useEffect, useState } from 'react'
import { Group, Stack, Text, UnstyledButton } from '@mantine/core'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import { fetchMcdText, unexpired, watchColor, type McdProps } from '@/features/spc/service'
import { acquireMcdFeed, acquireWatchFeed, useMcds, useWatches } from '@/features/spc/store'

function McdRow({ mcd }: { mcd: McdProps }) {
  const [text, setText] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const fmt = useTimeFormat()

  useEffect(() => {
    if (!open || text !== null) return
    fetchMcdText(mcd.product_id).then(setText, () => setText('(text unavailable)'))
  }, [open, text, mcd.product_id])

  return (
    <UnstyledButton onClick={() => setOpen(!open)} style={{ display: 'block', width: '100%' }}>
      <Group gap={6} wrap="nowrap">
        <Text size="xs" fw={600} style={{ flexShrink: 0 }}>
          MCD {mcd.num}
        </Text>
        <Text size="xs" c="dimmed" truncate>
          {mcd.concerning.toLowerCase()}
          {mcd.watch_confidence !== null && ` · ${mcd.watch_confidence}%`}
        </Text>
        <Text size="xs" c="dimmed" ff="monospace" ml="auto" style={{ flexShrink: 0 }}>
          til {fmt.hm(Date.parse(mcd.expire))}
        </Text>
      </Group>
      {open && (
        <Text size="xs" c="dimmed" ff="monospace" mt={4} style={{ whiteSpace: 'pre-wrap' }}>
          {text ?? 'loading…'}
        </Text>
      )}
    </UnstyledButton>
  )
}

/** Active watches, then mesoscale discussions with full text on expand. */
export function SpcPanel() {
  useEffect(() => acquireMcdFeed(), [])
  useEffect(() => acquireWatchFeed(), [])
  const fmt = useTimeFormat()
  const now = Date.now()
  const mcds = unexpired(useMcds(), now)
  const watches = useWatches()

  if (mcds.length === 0 && watches.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        No active watches or mesoscale discussions.
      </Text>
    )
  }

  return (
    <Stack gap={6}>
      {watches.map((w) => (
        <Group key={w.properties.number} gap={6} wrap="nowrap">
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: watchColor(w.properties.type),
              flexShrink: 0,
            }}
          />
          <Text size="xs" fw={600}>
            {w.properties.type} watch {w.properties.number}
            {w.properties.is_pds && ' · PDS'}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {[
              w.properties.max_hail_size !== null && `hail ${w.properties.max_hail_size}"`,
              w.properties.max_wind_gust_knots !== null &&
                `gusts ${w.properties.max_wind_gust_knots} kt`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </Group>
      ))}
      {mcds.map((m) => (
        <McdRow key={m.properties.product_id} mcd={m.properties} />
      ))}
      <Text size="xs" c="dimmed">
        Issued {fmt.zone === 'utc' ? 'times UTC' : 'times local'} · SPC via IEM.
      </Text>
    </Stack>
  )
}
