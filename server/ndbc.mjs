/**
 * NDBC latest observations: fetch the whitespace-delimited latest_obs.txt
 * (the upstream sends no CORS headers) and serve it parsed to JSON. One
 * global file covers every station, so there is nothing bbox-shaped here.
 */

const LATEST_URL = 'https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt'
const TTL_MS = 10 * 60_000

let cache = { at: 0, body: null }

/**
 * Parse latest_obs.txt. Columns (see the two # header lines):
 * STN LAT LON YYYY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES PTDY
 * ATMP WTMP DEWP VIS TIDE — "MM" marks a missing value.
 */
export function parseLatestObs(text) {
  const out = []
  for (const line of text.split('\n')) {
    if (line === '' || line.startsWith('#')) continue
    const c = line.trim().split(/\s+/)
    if (c.length < 22) continue
    const num = (i) => (c[i] === 'MM' ? null : Number(c[i]))
    out.push({
      id: c[0],
      lat: Number(c[1]),
      lon: Number(c[2]),
      timeMs: Date.UTC(Number(c[3]), Number(c[4]) - 1, Number(c[5]), Number(c[6]), Number(c[7])),
      wdir: num(8),
      wspd: num(9), // m/s
      gst: num(10),
      wvht: num(11), // m
      dpd: num(12), // s
      pres: num(15), // hPa
      atmp: num(17), // °C
      wtmp: num(18), // °C
    })
  }
  return out
}

/** JSON body for /proxy/ndbc, cached for the upstream's ~10-minute cadence. */
export async function getBuoysJson() {
  if (cache.body !== null && Date.now() - cache.at < TTL_MS) return cache.body
  const res = await fetch(LATEST_URL)
  if (!res.ok) throw new Error(`ndbc latest_obs ${res.status}`)
  const body = JSON.stringify(parseLatestObs(await res.text()))
  cache = { at: Date.now(), body }
  return body
}
