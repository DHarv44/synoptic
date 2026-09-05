import { useEffect, useState } from 'react'
import { Group, Stack, Text, UnstyledButton } from '@mantine/core'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import { useCameraStore } from '@/map/cameraStore'
import { pointsBbox } from '@/map/viewStore'
import { STATUS_COLORS } from '@/features/volcanoes/service'
import { acquireAdvisoryFeed, acquireUsgsFeed, useAdvisories, useUsgsNotices } from '@/features/volcanoes/store'
import type { VolcanicAshAdvisory } from '@/features/volcanoes/vaa'

function AdvisoryRow({ advisory }: { advisory: VolcanicAshAdvisory }) {
  const [open, setOpen] = useState(false)
  const { requestFitBounds, requestFlyTo } = useCameraStore()
  const fmt = useTimeFormat()

  // A click shows the raw bulletin and takes the map to the eruption —
  // framing the whole ash cloud when the advisory carries polygons.
  const points = [
    ...(advisory.position ? [advisory.position] : []),
    ...advisory.timesteps.flatMap((t) => t.polygons.flatMap((p) => p.points)),
  ]
  const bbox = pointsBbox(points)
  const onClick = () => {
    setOpen(!open)
    if (open) return
    if (bbox && points.length > 1) requestFitBounds(bbox)
    else if (advisory.position) requestFlyTo(advisory.position.lat, advisory.position.lon)
  }

  return (
    <UnstyledButton onClick={onClick} style={{ display: 'block', width: '100%' }}>
      <Group gap={6} wrap="nowrap">
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            background: STATUS_COLORS.erupting,
            flexShrink: 0,
          }}
        />
        <Text size="xs" fw={600}>
          {advisory.volcanoName}
        </Text>
        <Text size="xs" c="dimmed" truncate>
          {advisory.eruptionDetails.toLowerCase() || 'ash advisory'}
        </Text>
        {advisory.issuedMs !== null && (
          <Text size="xs" c="dimmed" ff="monospace" ml="auto" style={{ flexShrink: 0 }}>
            {fmt.hm(advisory.issuedMs)}
          </Text>
        )}
      </Group>
      {open && (
        <Text size="xs" c="dimmed" ff="monospace" mt={4} style={{ whiteSpace: 'pre-wrap' }}>
          {advisory.raw}
        </Text>
      )}
    </UnstyledButton>
  )
}

/** Erupting volcanoes (live VAAs) then US elevated notices; click to go there. */
export function VolcanoesPanel() {
  useEffect(() => acquireAdvisoryFeed(), [])
  useEffect(() => acquireUsgsFeed(), [])
  const requestFlyTo = useCameraStore((s) => s.requestFlyTo)
  const advisories = useAdvisories()
  const vaaNumbers = new Set(advisories.map((a) => a.volcanoNumber))
  // US notices already covered by a live advisory don't need a second row.
  const notices = useUsgsNotices().filter(
    (n) => n.alertLevel !== 'NORMAL' && !vaaNumbers.has(Number(n.vnum)),
  )

  if (advisories.length === 0 && notices.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        No volcanoes with active ash advisories or elevated alerts.
      </Text>
    )
  }

  return (
    <Stack gap={6}>
      {advisories.map((a) => (
        <AdvisoryRow key={`${a.vaac}-${a.volcanoName}-${a.issuedMs}`} advisory={a} />
      ))}
      {notices.map((n) => (
        <UnstyledButton
          // One AVO notice can cover several volcanoes with the same
          // noticeId, so the volcano number has to be part of the key.
          key={`${n.vnum}-${n.noticeId ?? ''}`}
          onClick={() => requestFlyTo(n.lat, n.long, 8)}
          style={{ display: 'block', width: '100%' }}
        >
          <Group gap={6} wrap="nowrap">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background:
                  n.colorCode === 'ORANGE' ? STATUS_COLORS.watch : STATUS_COLORS.advisory,
                flexShrink: 0,
              }}
            />
            <Text size="xs" fw={600}>
              {n.vName}
            </Text>
            <Text size="xs" c="dimmed" truncate>
              {n.colorCode} / {n.alertLevel}
            </Text>
          </Group>
        </UnstyledButton>
      ))}
      <Text size="xs" c="dimmed">
        Ash advisories · VAACs via NOAA. US alerts · USGS.
      </Text>
    </Stack>
  )
}
