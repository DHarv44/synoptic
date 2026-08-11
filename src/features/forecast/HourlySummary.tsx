import { useTempUnit } from '@/core/units/useUnitSystem'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import { fmtTemp } from '@/core/units/format'
import { useForecast } from '@/core/data/openMeteo/useForecast'
import { SectionHint } from '@/ui/SectionHint'
import { hourlySlice } from '@/features/forecast/service'

const WET = 40

/** Temperature range, and when rain becomes likely — if it does. */
export function HourlySummary() {
  const tempUnit = useTempUnit()
  const fmt = useTimeFormat()
  const { data } = useForecast()
  if (!data) return null

  const rows = hourlySlice(data, Date.now(), 24)
  if (rows.length === 0) return null
  const hi = Math.max(...rows.map((r) => r.tempC))
  const lo = Math.min(...rows.map((r) => r.tempC))
  const wet = rows.find((r) => r.precipProb >= WET)

  return (
    <SectionHint>
      {fmtTemp(hi, tempUnit)} / {fmtTemp(lo, tempUnit)}
      {wet ? ` · ${wet.precipProb}% from ${fmt.hm(wet.timeMs)}` : ' · dry'}
    </SectionHint>
  )
}
