/**
 * Which GFS run and forecast hour answer "what does the model say at this
 * valid time?" Shared by the wind and scalar-field servers.
 *
 * Past the latest run's start, the answer is the latest run's forecast:
 * hourly to f120, three-hourly to f384 (the 0.25° product's cadence). At
 * or before it, the answer is the analysis-side of the nearest earlier
 * cycle — f000..f005 of the 6-hourly cycle just before the valid time — so
 * scrubbing the clock back walks through real analyses, not one stale one.
 * NOMADS keeps about ten days of cycles; the app's clock reaches two.
 */

const HOUR_MS = 3600_000
const CYCLE_MS = 6 * HOUR_MS
const HOURLY_TO = 120
const MAX_HOUR = 384

export function pad2(n) {
  return String(n).padStart(2, '0')
}

/** { ymd: '20260906', cycle: 6 } → epoch ms of the cycle start. */
export function runStartMs(run) {
  return Date.UTC(
    Number(run.ymd.slice(0, 4)),
    Number(run.ymd.slice(4, 6)) - 1,
    Number(run.ymd.slice(6, 8)),
    run.cycle,
  )
}

export function runFromMs(ms) {
  const d = new Date(ms)
  return {
    ymd: `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}`,
    cycle: d.getUTCHours(),
  }
}

/** Forecast hours the product actually has: hourly, then every 3. */
export function snapHour(h) {
  const clamped = Math.max(0, Math.min(MAX_HOUR, h))
  if (clamped <= HOURLY_TO) return Math.round(clamped)
  return Math.min(MAX_HOUR, Math.round(clamped / 3) * 3)
}

/**
 * Run + hour for a valid time given the newest run known to exist.
 * Returns { run, fhour } with fhour already snapped to a published hour.
 */
export function resolveForecast(validMs, latestRun) {
  const latestMs = runStartMs(latestRun)
  if (validMs <= latestMs) {
    const cycleMs = Math.floor(validMs / CYCLE_MS) * CYCLE_MS
    return { run: runFromMs(cycleMs), fhour: Math.round((validMs - cycleMs) / HOUR_MS) }
  }
  return { run: latestRun, fhour: snapHour((validMs - latestMs) / HOUR_MS) }
}

/**
 * The same valid time from one cycle earlier — for when the newest run has
 * not published the hour yet (a run takes ~4 h to reach f384).
 */
export function previousCycle({ run, fhour }) {
  return { run: runFromMs(runStartMs(run) - CYCLE_MS), fhour: snapHour(fhour + 6) }
}

export function fhourStr(fhour) {
  return String(fhour).padStart(3, '0')
}

export function runLabel(run) {
  return `${run.ymd} ${pad2(run.cycle)}z`
}
