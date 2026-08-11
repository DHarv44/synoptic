import { Stack, Table, Text } from '@mantine/core'
import { useProbe } from '@/core/probe/store'
import { useUnits } from '@/core/units/useUnitSystem'
import { PanelHeader } from '@/ui/PanelHeader'
import {
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
  const u = useUnits()
  const { data, loading, error } = useForecast()

  return (
    <PanelGuard error={error} loading={loading || !data}>
      {point && data && (
        <Stack gap="xs">
          <PanelHeader right={`${data.current.time.slice(11, 16)}Z`} />
          <Text size="sm">{wmoText(data.current.weather_code)}</Text>
          <Table
            withRowBorders={false}
            verticalSpacing={2}
            fz="xs"
            data={{
              body: [
                ['Temperature', fmtTemp(data.current.temperature_2m, u.temp)],
                ['Feels like', fmtTemp(data.current.apparent_temperature, u.temp)],
                ['Dewpoint', fmtTemp(data.current.dew_point_2m, u.temp)],
                ['Humidity', fmtPercent(data.current.relative_humidity_2m)],
                [
                  'Wind',
                  `${fmtWindDir(data.current.wind_direction_10m)} ${fmtWind(data.current.wind_speed_10m, u.wind)}`,
                ],
                ['Gusts', fmtWind(data.current.wind_gusts_10m, u.wind)],
                ['Pressure', fmtPressure(data.current.pressure_msl, u.pressure)],
                ['Cloud cover', fmtPercent(data.current.cloud_cover)],
                ['Precip (1h)', fmtPrecip(data.current.precipitation, u.precip)],
              ],
            }}
          />
        </Stack>
      )}
    </PanelGuard>
  )
}
