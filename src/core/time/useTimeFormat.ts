import { useFeatureOption } from '@/core/settings/store'
import { fmtLocalDateTime, fmtLocalTime, fmtUtcDateTime, fmtUtcTime } from '@/core/time/format'

export type TimeZonePref = 'local' | 'utc'

export interface TimeFormatters {
  zone: TimeZonePref
  /** HH:MM:SS with a zone marker. */
  time: (ms: number) => string
  /** YYYY-MM-DD HH:MM with a zone marker. */
  dateTime: (ms: number) => string
}

/**
 * Display-time formatters honouring the user's zone preference. Storage and
 * computation stay UTC throughout — this is the display edge only.
 */
export function useTimeFormat(): TimeFormatters {
  const zone = useFeatureOption<TimeZonePref>('units', 'timeZone')
  const utc = zone === 'utc'
  return {
    zone: utc ? 'utc' : 'local',
    time: utc ? fmtUtcTime : fmtLocalTime,
    dateTime: utc ? fmtUtcDateTime : fmtLocalDateTime,
  }
}
