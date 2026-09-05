import { useTimeline } from '@/core/time/timelineStore'

/**
 * Deep-linkable clock: `#t=2026-09-05T05:40Z` sets the timeline on load, and
 * a scrubbed clock writes itself back so the moment is shareable. Live view
 * carries no hash — a bare URL always means "now". Storage is UTC minutes;
 * the display zone preference is a rendering concern and stays out of URLs.
 */
export function parseTimeHash(hash: string): number | null {
  const m = /[#&]t=(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z)/.exec(hash)
  if (!m) return null
  const ms = Date.parse(m[1])
  return Number.isFinite(ms) ? ms : null
}

export function formatTimeHash(ms: number): string {
  return `#t=${new Date(ms).toISOString().slice(0, 16)}Z`
}

function writeHash(simTime: number, isLive: boolean): void {
  const target = isLive ? '' : formatTimeHash(simTime)
  const current = window.location.hash
  if (current === target || (target === '' && current === '')) return
  // replaceState, not location.hash: no history spam, no scroll jumps.
  window.history.replaceState(null, '', window.location.pathname + window.location.search + target)
}

/** Call once at boot, before render. Returns an unsubscribe for tests. */
export function initUrlTime(): () => void {
  const t = parseTimeHash(window.location.hash)
  if (t !== null) useTimeline.getState().setSimTime(t)

  // Browsers rate-limit replaceState, so neither playback (a frame every few
  // hundred ms) nor a slider drag may write per change; the URL updates when
  // the clock comes to rest.
  let timer = 0
  const unsub = useTimeline.subscribe((s) => {
    if (s.playing) return
    window.clearTimeout(timer)
    timer = window.setTimeout(() => writeHash(s.simTime, s.isLive), 300)
  })
  const onHashChange = (): void => {
    const ms = parseTimeHash(window.location.hash)
    if (ms !== null) useTimeline.getState().setSimTime(ms)
  }
  window.addEventListener('hashchange', onHashChange)
  return () => {
    unsub()
    window.clearTimeout(timer)
    window.removeEventListener('hashchange', onHashChange)
  }
}
