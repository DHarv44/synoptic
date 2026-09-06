import { useEffect, useState } from 'react'
import { Group, Stack, Text, UnstyledButton } from '@mantine/core'
import type { BestTrackPoint } from '@/features/tropical/atcf'
import { Discussion, IntensityTrace } from '@/features/tropical/StormDetails'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import { useUnits } from '@/core/units/useUnitSystem'
import { fmtPressure, fmtWind } from '@/core/units/format'
import { useCameraStore } from '@/map/cameraStore'
import { useHome } from '@/core/home/store'
import { arrivalAtPoint } from '@/features/tropical/arrival'
import type { StormGis } from '@/features/tropical/gis'
import { CATEGORY_COLORS, motionText, stormCategory, type ActiveStorm } from '@/features/tropical/service'
import { acquireTropicalFeed, useTropical } from '@/features/tropical/store'

const KT_TO_MS = 0.514444
const arrivalLabel = (f: GeoJSON.Feature): string => String(f.properties?.arrival_time ?? '')

/** "TS-force winds at home ≈ Mon 8 am · earliest Sun 8 pm", when NHC drew lines there. */
function HomeArrival({ gis }: { gis: StormGis | undefined }) {
  const home = useHome((s) => s.point)
  if (!home || !gis) return null
  const a = arrivalAtPoint(gis.arrivalLikely.features, gis.arrivalEarliest.features, home.lat, home.lon, arrivalLabel)
  if (!a) return null
  return (
    <Text size="xs" c="orange" pl={16}>
      TS-force winds at {home.name ?? 'home'} ≈ {a.likely}
      {a.earliest && ` · earliest ${a.earliest}`}
    </Text>
  )
}

function StormRow({
  storm,
  gis,
  history,
}: {
  storm: ActiveStorm
  gis: StormGis | undefined
  history: BestTrackPoint[] | undefined
}) {
  const fmt = useTimeFormat()
  const u = useUnits()
  const requestFlyTo = useCameraStore((s) => s.requestFlyTo)
  const [open, setOpen] = useState(false)
  const cat = stormCategory(storm.classification, storm.intensityKt)
  // A click flies to the storm and opens its details; a second closes them.
  const onClick = (): void => {
    setOpen(!open)
    if (!open) requestFlyTo(storm.lat, storm.lon, 5)
  }
  return (
    <UnstyledButton onClick={onClick} style={{ display: 'block', width: '100%' }}>
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
      <HomeArrival gis={gis} />
      {open && (
        <Stack gap={6} pl={16} pt={4} onClick={(e) => e.stopPropagation()}>
          <IntensityTrace history={history} />
          <Discussion storm={storm} />
        </Stack>
      )}
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
        <StormRow key={s.id} storm={s} gis={data.gis[s.id]} history={data.history[s.id]} />
      ))}
      <Text size="xs" c="dimmed">
        NHC advisories. The cone is where the centre may go, not how far the storm reaches.
      </Text>
    </Stack>
  )
}
