import type { OpenMeteoForecast } from '@/core/data/openMeteo/types'
import { dailyRows, hourlySlice, type HourRow } from '@/features/forecast/service'

/**
 * The plain-language verdict: the one line that says what the forecast means
 * before any numbers are read.
 *
 * Times and speeds are returned as tokens rather than text, because how they
 * are written belongs to the display edge — the user's local/UTC preference
 * and wind unit — not to the characterization.
 */
export type VerdictPart = string | { timeMs: number } | { gustMs: number }

/** How far ahead the verdict looks at hourly detail. */
const WINDOW_HOURS = 18

/** An hour that would read as "wet" to someone standing in it. */
function isWet(h: HourRow): boolean {
  return h.precipProb >= 50 || h.precipMm >= 0.2
}

/**
 * Weather-code family, most severe wins. Thresholded on the code rather than
 * the amount, because 1 mm of freezing rain matters more than 10 mm of rain.
 */
function kind(code: number): 'storms' | 'freezing rain' | 'snow' | 'rain' | null {
  if (code >= 95) return 'storms'
  if (code === 56 || code === 57 || code === 66 || code === 67) return 'freezing rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if ((code >= 51 && code <= 65) || (code >= 80 && code <= 82)) return 'rain'
  return null
}

/** The dominant kind over a run of hours: the most severe one present. */
function dominantKind(hours: HourRow[]): string {
  const rank = ['storms', 'freezing rain', 'snow', 'rain']
  let best: string | null = null
  for (const h of hours) {
    const k = kind(h.code)
    if (k && (best === null || rank.indexOf(k) < rank.indexOf(best))) best = k
  }
  return best ?? 'rain'
}

/** Notable enough to say out loud: ~30 kt. */
const GUST_NOTABLE_MS = 15

/** A day-to-day change you dress differently for. */
const SWING_NOTABLE_C = 7

function capitalize(parts: VerdictPart[]): VerdictPart[] {
  const [first, ...rest] = parts
  if (typeof first === 'string') return [first.charAt(0).toUpperCase() + first.slice(1), ...rest]
  return parts
}

/**
 * One line, at most two clauses: what precipitation is doing (the thing
 * everyone asks first), then the single most notable of storms / wind /
 * temperature swing. Anything longer stops being a verdict and becomes a
 * forecast discussion, which the panels below already are.
 */
export function characterize(f: OpenMeteoForecast, nowMs: number): VerdictPart[] | null {
  const hours = hourlySlice(f, nowMs, WINDOW_HOURS)
  if (hours.length === 0) return null
  const days = dailyRows(f, 2)

  const parts: VerdictPart[] = []

  const firstWet = hours.findIndex(isWet)
  if (firstWet === 0) {
    // Wet now — the useful fact is when it stops. "Stopped" means a real gap,
    // not one dry hour inside a showery afternoon.
    let end = -1
    for (let i = 1; i <= hours.length - 3; i++) {
      if (!isWet(hours[i]) && !isWet(hours[i + 1]) && !isWet(hours[i + 2])) {
        end = i
        break
      }
    }
    parts.push(dominantKind(hours.slice(0, end === -1 ? undefined : end)))
    if (end === -1) parts.push(' continuing')
    else parts.push(' until ~', { timeMs: hours[end].timeMs })
  } else if (firstWet > 0) {
    parts.push(dominantKind(hours.slice(firstWet)), ' from ~', { timeMs: hours[firstWet].timeMs })
  } else if (days.length > 1 && days[1].precipProb >= 50 && kind(days[1].code)) {
    parts.push('dry today · ', String(kind(days[1].code)), ' tomorrow')
  } else {
    parts.push('dry through tomorrow')
  }

  // Second clause: one only, in order of how much it changes someone's plans.
  const mainIsStorms = parts[0] === 'storms'
  const firstStorm = hours.find((h) => h.code >= 95)
  const maxGust = Math.max(...days.map((d) => d.gustMs), 0)
  const swing = days.length > 1 ? days[1].highC - days[0].highC : 0

  if (!mainIsStorms && firstStorm) {
    parts.push(' · storms possible ~', { timeMs: firstStorm.timeMs })
  } else if (maxGust >= GUST_NOTABLE_MS) {
    parts.push(' · gusts to ', { gustMs: maxGust })
  } else if (Math.abs(swing) >= SWING_NOTABLE_C) {
    parts.push(swing > 0 ? ' · much warmer tomorrow' : ' · much cooler tomorrow')
  }

  return capitalize(parts)
}
