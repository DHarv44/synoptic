import { useEffect } from 'react'
import { Badge, Group, Stack, Text } from '@mantine/core'
import { useCachedFetch } from '@/core/data/useCachedFetch'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import {
  QUAKE_DAYS,
  QUAKE_RADIUS_KM,
  STATUS_COLORS,
  fetchQuakesNear,
  type VolcanoStatus,
} from '@/features/volcanoes/service'
import { useAdvisories, useInspect } from '@/features/volcanoes/store'
import type { MapPopupProps } from '@/map/popups/registry'

const STATUS_TEXT: Record<string, string> = {
  erupting: 'ERUPTING',
  watch: 'WATCH',
  advisory: 'ADVISORY',
  quiet: 'quiet',
}

/** Click a triangle: what this mountain is, and what it's doing right now. */
export function VolcanoPopup({ properties }: MapPopupProps) {
  const fmt = useTimeFormat()
  const status = String(properties.status ?? 'quiet') as VolcanoStatus
  const number = typeof properties.number === 'number' ? properties.number : null
  const advisory = useAdvisories().find((a) => a.volcanoNumber === number)
  const lastYear = properties.lastEruptionYear

  const lat = typeof properties.lat === 'number' ? properties.lat : null
  const lon = typeof properties.lon === 'number' ? properties.lon : null
  const quakes = useCachedFetch(
    number !== null && lat !== null && lon !== null ? `volcano-quakes-${number}` : null,
    10 * 60_000,
    () => fetchQuakesNear(lat!, lon!),
  ).data

  // While this card is open, the layer draws its quakes as dots on the map.
  const { setInspect, clearInspect } = useInspect()
  useEffect(() => {
    if (number === null || quakes === null) return
    setInspect(number, quakes)
    return () => clearInspect(number)
  }, [number, quakes, setInspect, clearInspect])

  const mags = quakes?.map((q) => q.mag).filter((m): m is number => m !== null) ?? []

  return (
    <Stack gap={4}>
      <Group gap={6} wrap="nowrap">
        <Text size="sm" fw={600}>
          {String(properties.name ?? 'Volcano')}
        </Text>
        <Badge
          size="xs"
          variant={status === 'quiet' ? 'outline' : 'filled'}
          color="gray"
          styles={
            status === 'quiet' ? undefined : { root: { background: STATUS_COLORS[status] } }
          }
        >
          {STATUS_TEXT[status]}
        </Badge>
      </Group>
      <Text size="xs" c="dimmed">
        {String(properties.country ?? '')} · {String(properties.vtype ?? '')}
        {typeof properties.elevation === 'number' && ` · ${properties.elevation} m`}
        {typeof lastYear === 'number' && ` · last erupted ${lastYear < 0 ? `${-lastYear} BCE` : lastYear}`}
      </Text>
      {advisory && (
        <>
          <Text size="xs">
            {advisory.eruptionDetails || 'Ash advisory in effect.'}
          </Text>
          <Text size="xs" c="dimmed">
            VAAC {advisory.vaac}
            {advisory.issuedMs !== null && ` · issued ${fmt.hm(advisory.issuedMs)}`}
          </Text>
        </>
      )}
      {!advisory && properties.synopsis !== '' && (
        <Text size="xs" lineClamp={3}>
          {String(properties.synopsis)}
        </Text>
      )}
      {quakes !== null && (
        <Text size="xs" c="dimmed">
          {quakes.length > 0
            ? `${quakes.length} quake${quakes.length === 1 ? '' : 's'} ≤${QUAKE_RADIUS_KM} km / ${QUAKE_DAYS} d` +
              (mags.length > 0 ? ` · max M${Math.max(...mags).toFixed(1)}` : '')
            : `no quakes catalogued ≤${QUAKE_RADIUS_KM} km / ${QUAKE_DAYS} d`}
        </Text>
      )}
    </Stack>
  )
}
