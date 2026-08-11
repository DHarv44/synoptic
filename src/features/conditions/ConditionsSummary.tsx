import { useUnits } from '@/core/units/useUnitSystem'
import { fmtTemp } from '@/core/units/format'
import { useForecast } from '@/core/data/openMeteo/useForecast'
import { wmoText } from '@/core/data/openMeteo/forecast'
import { SectionHint } from '@/ui/SectionHint'

/** Temperature and sky, the two things worth seeing without expanding. */
export function ConditionsSummary() {
  const u = useUnits()
  const { data } = useForecast()
  if (!data) return null
  return (
    <SectionHint>
      {fmtTemp(data.current.temperature_2m, u.temp)} · {wmoText(data.current.weather_code)}
    </SectionHint>
  )
}
