import { useEffect } from 'react'
import { Group, Stack, Text, UnstyledButton } from '@mantine/core'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import { useUnits } from '@/core/units/useUnitSystem'
import { fmtPressure, fmtWind } from '@/core/units/format'
import { useCameraStore } from '@/map/cameraStore'
import { CATEGORY_COLORS, motionText, stormCategory, type ActiveStorm } from '@/features/tropical/service'
import { acquireTropicalFeed, useTropical } from '@/features/tropical/store'

const KT_TO_MS = 0.514444

function StormRow({ storm }: { storm: ActiveStorm }) {
  const fmt = useTimeFormat()
  const u = useUnits()
  const requestFlyTo = useCameraStore((s) => s.requestFlyTo)
  const cat = stormCategory(storm.classification, storm.intensityKt)
  return (
    <UnstyledButton
      onClick={() => requestFlyTo(storm.lat, storm.lon, 5)}
      style={{ display: 'block', width: '100%' }}
    >
      <Group gap={6} wrap="nowrap">
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            background: CATEGORY_COLORS[cat.key],
            border: '1px solid rgba(0,0,0,0.5)',
            flexShrink: 0,
          }}
        />
        <Text size="xs" fw={600} style={{ flexShrink: 0 }}>
          {storm.name}
        </Text>
        <Text size="xs" c="dimmed" truncate>
          {cat.label} · {fmtWind(storm.intensityKt * KT_TO_MS, u.wind)}
          {storm.pressureMb !== null && ` · ${fmtPressure(storm.pressureMb, u.pressure)}`}
          {` · ${motionText(storm.movementDir, storm.movementSpeedKt)}`}
        </Text>
        <Text size="xs" c="dimmed" ff="monospace" ml="auto" style={{ flexShrink: 0 }}>
          #{storm.advNum} {fmt.hm(storm.lastUpdateMs)}
        </Text>
      </Group>
    </UnstyledButton>
  )
}

/** Active tropical cyclones, strongest first; a row flies to the storm. */
export function TropicalPanel() {
  useEffect(() => acquireTropicalFeed(), [])
  const data = useTropical()
  const storms = [...(data?.storms ?? [])].sort((a, b) => b.intensityKt - a.intensityKt)

  if (data === null) {
    return (
      <Text size="xs" c="dimmed">
        Loading active storms…
      </Text>
    )
  }
  if (storms.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        No active tropical cyclones in the Atlantic, East or Central Pacific.
      </Text>
    )
  }
  return (
    <Stack gap={6}>
      {storms.map((s) => (
        <StormRow key={s.id} storm={s} />
      ))}
      <Text size="xs" c="dimmed">
        NHC advisories. The cone is where the centre may go, not how far the storm reaches.
      </Text>
    </Stack>
  )
}
