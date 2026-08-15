import { Text } from '@mantine/core'
import { useForecast } from '@/core/data/openMeteo/useForecast'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import { useUnits } from '@/core/units/useUnitSystem'
import { fmtWind } from '@/core/units/format'
import { characterize, type VerdictPart } from '@/features/forecast/characterize'

/**
 * The verdict line under the place name: the forecast in one glance, before
 * any section is expanded. Times and speeds are tokens from `characterize`,
 * written out here so they honour the local/UTC and wind-unit preferences.
 */
export function ForecastVerdict() {
  const { data } = useForecast()
  const fmt = useTimeFormat()
  const u = useUnits()

  if (!data) return null
  const parts = characterize(data, Date.now())
  if (!parts) return null

  const render = (p: VerdictPart, i: number): string => {
    void i
    if (typeof p === 'string') return p
    if ('timeMs' in p) return fmt.hm(p.timeMs)
    return fmtWind(p.gustMs, u.wind)
  }

  return (
    <Text size="xs" c="dimmed" px="xs" pb={6} lineClamp={1}>
      {parts.map(render).join('')}
    </Text>
  )
}
