import { Group, Stack, Text } from '@mantine/core'
import { useProbe } from '@/core/probe/store'
import { fmtLatLon } from '@/core/units/format'
import { fmtUtcDateTime } from '@/core/time/format'
import { PanelGuard } from '@/ui/PanelGuard'
import { useSounding } from '@/features/sounding/useSounding'
import { SkewT } from '@/features/sounding/SkewT'
import { Hodograph } from '@/features/sounding/Hodograph'
import { IndicesTable } from '@/features/sounding/IndicesTable'

/** Skew-T, hodograph, and derived indices for the probe point + timeline hour. */
export function SoundingPanel() {
  const point = useProbe((s) => s.point)
  const { sounding, loading, error } = useSounding()

  return (
    <PanelGuard error={error} loading={loading || (point !== null && sounding === null)}>
      {point && sounding && (
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" fw={600}>
              {point.name ?? fmtLatLon(point.lat, point.lon)}
            </Text>
            <Text size="xs" ff="monospace" c="dimmed">
              {fmtUtcDateTime(sounding.timeMs)}
            </Text>
          </Group>
          <SkewT sounding={sounding} />
          <Group align="flex-start" gap="xs" wrap="nowrap">
            <Hodograph sounding={sounding} />
          </Group>
          <IndicesTable sounding={sounding} />
          <Text size="xs" c="dimmed">
            Model profile (Open-Meteo pressure levels), surface-based parcel, no
            virtual-temperature correction.
          </Text>
        </Stack>
      )}
    </PanelGuard>
  )
}
