import { useTempUnit } from '@/core/units/useUnitSystem'
import { fmtTemp } from '@/core/units/format'
import { useForecast } from '@/core/data/openMeteo/useForecast'
import { wmoText } from '@/core/data/openMeteo/forecast'
import { SectionHint } from '@/ui/SectionHint'
import { dailyRows } from '@/features/forecast/service'

/** Today's high and low, plus how it looks. */
export function DailySummary() {
  const tempUnit = useTempUnit()
  const { data } = useForecast()
  if (!data) return null

  const [today] = dailyRows(data, 1)
  if (!today) return null
  return (
    <SectionHint>
      {fmtTemp(today.highC, tempUnit)} / {fmtTemp(today.lowC, tempUnit)} ·{' '}
      {wmoText(today.code)}
    </SectionHint>
  )
}
