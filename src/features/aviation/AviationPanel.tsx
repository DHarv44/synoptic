import { useEffect, useState } from 'react'
import { Group, Stack, Text, UnstyledButton } from '@mantine/core'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import { activeSigmets, sigmetColor, type AirSigmet } from '@/features/aviation/service'
import { acquireSigmetFeed, useSigmetData } from '@/features/aviation/store'

/** "FL440" from feet, or nothing when the product carries no top. */
function tops(s: AirSigmet): string | null {
  return s.altitudeHi1 ? `FL${Math.round(s.altitudeHi1 / 100)}` : null
}

function SigmetRow({ s }: { s: AirSigmet }) {
  const [open, setOpen] = useState(false)
  const fmt = useTimeFormat()
  const detail = [tops(s), s.movementSpd ? `mov ${s.movementDir}° ${s.movementSpd} kt` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <UnstyledButton onClick={() => setOpen(!open)} style={{ display: 'block', width: '100%' }}>
      <Group gap={6} wrap="nowrap">
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            background: sigmetColor(s.hazard),
            flexShrink: 0,
          }}
        />
        <Text size="xs" fw={600} style={{ flexShrink: 0 }}>
          {s.hazard}
        </Text>
        <Text size="xs" c="dimmed" truncate>
          {detail}
        </Text>
        <Text size="xs" c="dimmed" ff="monospace" ml="auto" style={{ flexShrink: 0 }}>
          til {fmt.hm(s.validTimeTo * 1000)}
        </Text>
      </Group>
      {open && (
        <Text size="xs" c="dimmed" ff="monospace" mt={4} style={{ whiteSpace: 'pre-wrap' }}>
          {s.rawAirSigmet}
        </Text>
      )}
    </UnstyledButton>
  )
}

/** Active SIGMETs, worst-first; a row expands to the raw product text. */
export function AviationPanel() {
  useEffect(() => acquireSigmetFeed(), [])
  const sigmets = activeSigmets(useSigmetData(), Date.now())

  if (sigmets.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        No SIGMETs in effect.
      </Text>
    )
  }
  const sorted = [...sigmets].sort((a, b) =>
    a.hazard === 'CONVECTIVE' === (b.hazard === 'CONVECTIVE') ? 0 : a.hazard === 'CONVECTIVE' ? -1 : 1,
  )
  return (
    <Stack gap={6}>
      {sorted.map((s, i) => (
        <SigmetRow key={i} s={s} />
      ))}
    </Stack>
  )
}
