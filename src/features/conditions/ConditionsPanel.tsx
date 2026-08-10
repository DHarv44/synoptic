import { Group, Stack, Table, Text } from '@mantine/core'
import { useProbe } from '@/core/probe/store'
import { useTempUnit, useUnitSystem } from '@/core/units/useUnitSystem'
import {
  fmtLatLon,
  fmtPercent,
  fmtPressure,
  fmtPrecip,
  fmtTemp,
  fmtWind,
  fmtWindDir,
} from '@/core/units/format'
import { useForecast } from '@/core/data/openMeteo/useForecast'
import { wmoText } from '@/core/data/openMeteo/forecast'
import { PanelGuard } from '@/ui/PanelGuard'

/** Current conditions readout for the probed point. */
export function ConditionsPanel() {
  const point = useProbe((s) => s.point)
  const units = useUnitSystem()
  const tempUnit = useTempUnit()
  const { data, loading, error } = useForecast()

  return (
    <PanelGuard error={error} loading={loading || !data}>
      {point && data && (
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" fw={600}>
              {point.name ?? fmtLatLon(point.lat, point.lon)}
            </Text>
            <Text size="xs" ff="monospace" c="dimmed">
              {data.current.time.slice(11, 16)}Z
            </Text>
          </Group>
          <Text size="sm">{wmoText(data.current.weather_code)}</Text>
          <Table
            withRowBorders={false}
            verticalSpacing={2}
            fz="xs"
            data={{
              body: [
                ['Temperature', fmtTemp(data.current.temperature_2m, tempUnit)],
                ['Feels like', fmtTemp(data.current.apparent_temperature, tempUnit)],
                ['Dewpoint', fmtTemp(data.current.dew_point_2m, tempUnit)],
                ['Humidity', fmtPercent(data.current.relative_humidity_2m)],
                [
                  'Wind',
                  `${fmtWindDir(data.current.wind_direction_10m)} ${fmtWind(data.current.wind_speed_10m, units)}`,
                ],
                ['Gusts', fmtWind(data.current.wind_gusts_10m, units)],
                ['Pressure', fmtPressure(data.current.pressure_msl)],
                ['Cloud cover', fmtPercent(data.current.cloud_cover)],
                ['Precip (1h)', fmtPrecip(data.current.precipitation, units)],
              ],
            }}
          />
        </Stack>
      )}
    </PanelGuard>
  )
}
