/** UTC-first time formatting — the single source for time display strings. */

export function fmtUtcTime(ms: number): string {
  return new Date(ms).toISOString().slice(11, 19) + 'Z'
}

/** Short zone marker for labelling a time display. */
export function zoneLabel(utc: boolean): string {
  if (utc) return 'UTC'
  return new Intl.DateTimeFormat([], { timeZoneName: 'short' })
    .formatToParts(new Date())
    .find((p) => p.type === 'timeZoneName')?.value ?? 'local'
}

export function fmtUtcDateTime(ms: number): string {
  const iso = new Date(ms).toISOString()
  return iso.slice(0, 10) + ' ' + iso.slice(11, 16) + 'Z'
}

export function fmtLocalTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function fmtLocalDateTime(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
