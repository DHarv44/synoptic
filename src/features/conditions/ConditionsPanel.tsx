import { Alert, Group, Loader, Stack, Table, Text } from '@mantine/core'
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

/** Current conditions readout for the probed point. */
export function ConditionsPanel() {
  const point = useProbe((s) => s.point)
  const units = useUnitSystem()
  const tempUnit = useTempUnit()
  const { data, loading, error } = useForecast()

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
  if (loading || !data) {
    return <Loader size="xs" />
  }

  const c = data.current
  const rows: Array<[string, string]> = [
    ['Temperature', fmtTemp(c.temperature_2m, tempUnit)],
    ['Feels like', fmtTemp(c.apparent_temperature, tempUnit)],
    ['Dewpoint', fmtTemp(c.dew_point_2m, tempUnit)],
    ['Humidity', fmtPercent(c.relative_humidity_2m)],
    ['Wind', `${fmtWindDir(c.wind_direction_10m)} ${fmtWind(c.wind_speed_10m, units)}`],
    ['Gusts', fmtWind(c.wind_gusts_10m, units)],
    ['Pressure', fmtPressure(c.pressure_msl)],
    ['Cloud cover', fmtPercent(c.cloud_cover)],
    ['Precip (1h)', fmtPrecip(c.precipitation, units)],
  ]

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text size="sm" fw={600}>
          {point.name ?? fmtLatLon(point.lat, point.lon)}
        </Text>
        <Text size="xs" ff="monospace" c="dimmed">
          {c.time.slice(11, 16)}Z
        </Text>
      </Group>
      <Text size="sm">{wmoText(c.weather_code)}</Text>
      <Table
        withRowBorders={false}
        verticalSpacing={2}
        data={{ body: rows.map(([k, v]) => [k, v]) }}
        fz="xs"
      />
    </Stack>
  )
}
