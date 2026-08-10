/** UTC-first time formatting — the single source for time display strings. */

export function fmtUtcTime(ms: number): string {
  return new Date(ms).toISOString().slice(11, 19) + 'Z'
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
