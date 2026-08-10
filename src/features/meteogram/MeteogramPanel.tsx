import { useMemo } from 'react'
import { Group, Stack } from '@mantine/core'
import { PanelGuard } from '@/ui/PanelGuard'
import { PanelHeader } from '@/ui/PanelHeader'
import { LegendDot } from '@/ui/LegendDot'
import { useProbe } from '@/core/probe/store'
import { useForecast } from '@/core/data/openMeteo/useForecast'
import { useTempUnit } from '@/core/units/useUnitSystem'
import { toSeries } from '@/features/meteogram/series'
import { MeteogramChart } from '@/features/meteogram/MeteogramChart'

/** 7-day meteogram for the probed point. */
export function MeteogramPanel() {
  const point = useProbe((s) => s.point)
  const tempUnit = useTempUnit()
  const { data, loading, error } = useForecast()
  const series = useMemo(() => (data ? toSeries(data) : null), [data])

  return (
    <PanelGuard error={error} loading={loading || !series}>
      {point && series && (
        <Stack gap="xs">
          <PanelHeader suffix="7 days" />
          <MeteogramChart series={series} tempUnit={tempUnit} />
          <Group gap="sm">
            <LegendDot color="var(--mantine-color-red-6)" label="Temp" />
            <LegendDot color="var(--mantine-color-teal-6)" label="Dewpoint" />
            <LegendDot color="var(--mantine-color-blue-6)" label="Precip" />
            <LegendDot color="var(--mantine-color-blue-4)" label="Prob %" />
          </Group>
        </Stack>
      )}
    </PanelGuard>
  )
}
