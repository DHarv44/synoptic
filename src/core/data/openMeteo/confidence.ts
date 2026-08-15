import { MODELS, modelSeries, type HourlyByModel } from '@/core/data/openMeteo/models'

/**
 * Where the multi-model set stops agreeing, read from 2 m temperature.
 *
 * Temperature only, on purpose: it is the variable every model carries at
 * every hour, and cross-model temperature spread is the classic first sign of
 * a diverging synoptic pattern. Precipitation spread is noisier than it is
 * informative at point scale, and saying "models agree" off the back of it
 * would overstate what we know.
 */
export interface Agreement {
  /** Last UTC date (YYYY-MM-DD) the models still agree on. */
  throughDate: string
  /** First date the spread exceeds the threshold, or null if none does. */
  divergesOn: string | null
}

/**
 * Mean daily max−min across models beyond this reads as a different forecast,
 * not a different shade of the same one.
 */
const SPREAD_C = 5

/** Days needing at least this many models reporting to be judged at all. */
const MIN_MODELS = 3

export function temperatureAgreement(data: HourlyByModel, nowMs: number): Agreement | null {
  const times = data.hourly.time
  if (!times || times.length === 0) return null
  const series = MODELS.map((m) => modelSeries(data, 'temperature_2m', m.key)).filter(
    (s): s is Array<number | null> => s !== null,
  )
  if (series.length < MIN_MODELS) return null

  const todayUtc = new Date(nowMs).toISOString().slice(0, 10)
  // date → [sum of hourly spreads, hours counted]
  const byDate = new Map<string, [number, number]>()
  for (let i = 0; i < times.length; i++) {
    const date = times[i].slice(0, 10)
    if (date < todayUtc) continue
    const values = series
      .map((s) => s[i])
      .filter((v): v is number => v !== null && Number.isFinite(v))
    if (values.length < MIN_MODELS) continue
    const spread = Math.max(...values) - Math.min(...values)
    const acc = byDate.get(date) ?? [0, 0]
    byDate.set(date, [acc[0] + spread, acc[1] + 1])
  }

  const dates = [...byDate.keys()].sort()
  if (dates.length === 0) return null

  let through = dates[0]
  for (const date of dates) {
    const [sum, n] = byDate.get(date)!
    if (sum / n > SPREAD_C) return { throughDate: through, divergesOn: date }
    through = date
  }
  return { throughDate: through, divergesOn: null }
}
