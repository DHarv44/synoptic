import { useMemo } from 'react'
import { Alert, Group, Loader, Stack, Text } from '@mantine/core'
import { useProbe } from '@/core/probe/store'
import { useForecast } from '@/core/data/openMeteo/useForecast'
import { useTempUnit } from '@/core/units/useUnitSystem'
import { fmtLatLon } from '@/core/units/format'
import { toSeries } from '@/features/meteogram/series'
import { MeteogramChart } from '@/features/meteogram/MeteogramChart'

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <Group gap={4} wrap="nowrap">
      <div style={{ width: 8, height: 2, background: color }} />
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Group>
  )
}

/** 7-day meteogram for the probed point. */
export function MeteogramPanel() {
  const point = useProbe((s) => s.point)
  const tempUnit = useTempUnit()
  const { data, loading, error } = useForecast()
  const series = useMemo(() => (data ? toSeries(data) : null), [data])

  if (!point) {
    return (
      <Text size="xs" c="dimmed">
        Click the globe to probe a location.
      </Text>
    )
  }
  if (error !== null) {
    return (
      <Alert color="red" title="Source unreachable" variant="light">
        <Text size="xs">{error}</Text>
      </Alert>
    )
  }
  if (loading || !series) return <Loader size="xs" />

  return (
    <Stack gap="xs">
      <Text size="sm" fw={600}>
        {point.name ?? fmtLatLon(point.lat, point.lon)} · 7 days
      </Text>
      <MeteogramChart series={series} tempUnit={tempUnit} />
      <Group gap="sm">
        <LegendDot color="var(--mantine-color-red-6)" label="Temp" />
        <LegendDot color="var(--mantine-color-teal-6)" label="Dewpoint" />
        <LegendDot color="var(--mantine-color-blue-6)" label="Precip" />
        <LegendDot color="var(--mantine-color-blue-4)" label="Prob %" />
      </Group>
    </Stack>
  )
}
