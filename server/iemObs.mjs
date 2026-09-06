/**
 * IEM currents: the observation tiers a surface plot carries beyond METAR.
 * Road-weather (RWIS) stations across the US and the WMO SYNOP land
 * stations worldwide, each one lean class feed from the IEM currents API,
 * kept warm for ten minutes and served to the client by bbox in the METAR
 * record shape so the station-model layer plots them as one set.
 *
 * Why not the everything feed: 66 MB and 47 k stations, most of them
 * DCP/COOP gauges with no temperature. IEM's own ASOS/AWOS class is the
 * same METARs aviationweather.gov already serves, so it is not fetched.
 */
const IEM = 'https://mesonet.agron.iastate.edu/api/1/currents.geojson'
/** Upstream drops observations older than this. */
const MAX_AGE_MIN = 180
const REFRESH_MS = 10 * 60_000

export const TIERS = {
  road: { kind: 'road', query: `networkclass=RWIS&country=US&minutes=${MAX_AGE_MIN}` },
  synop: { kind: 'synop', query: `network=WMO_BUFR_SRF&minutes=${MAX_AGE_MIN}` },
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const fToC = (f) => (num(f) === null ? null : Math.round(((f - 32) * 5) / 9 * 10) / 10)
const text = (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null)

/** IEM currents GeoJSON → station-model records (°C, kt, degrees, hPa). */
export function parseCurrents(geojson, kind) {
  const out = []
  for (const f of geojson?.features ?? []) {
    const p = f.properties ?? {}
    const coords = f.geometry?.coordinates
    const lon = num(coords?.[0])
    const lat = num(coords?.[1])
    if (lat === null || lon === null) continue
    const temp = fToC(p.tmpf)
    const wspd = num(p.sknt)
    // Nothing a station model could draw.
    if (temp === null && wspd === null) continue
    const obsTime = Math.round(Date.parse(p.utc_valid ?? '') / 1000)
    if (!Number.isFinite(obsTime)) continue
    out.push({
      icaoId: String(p.station ?? ''),
      kind,
      network: String(p.network ?? ''),
      name: String(p.name ?? ''),
      lat: Math.round(lat * 1000) / 1000,
      lon: Math.round(lon * 1000) / 1000,
      temp,
      dewp: fToC(p.dwpf),
      wdir: num(p.drct),
      wspd: wspd === null ? null : Math.round(wspd),
      gust: num(p.gust) === null ? null : Math.round(p.gust),
      mslp: num(p.mslp) === null ? null : Math.round(p.mslp * 10) / 10,
      wx: text(p.wxcodes),
      sky: text(p.skyc1),
      fltCat: null,
      rawOb: '',
      obsTime,
    })
  }
  return out
}

/** `latMin,lonMin,latMax,lonMax` (the METAR bbox order) → tuple, or null. */
export function parseBbox(raw) {
  if (typeof raw !== 'string') return null
  const v = raw.split(',').map(Number)
  if (v.length !== 4 || v.some((x) => !Number.isFinite(x))) return null
  return v
}

export function parseTiers(raw) {
  return String(raw ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t in TIERS)
}

export function inBbox(s, [latMin, lonMin, latMax, lonMax]) {
  return s.lat >= latMin && s.lat <= latMax && s.lon >= lonMin && s.lon <= lonMax
}

/** tier → { at, records, inflight } */
const cache = new Map()

async function tierRecords(tier) {
  const spec = TIERS[tier]
  let c = cache.get(tier)
  if (!c) {
    c = { at: 0, records: [], inflight: null }
    cache.set(tier, c)
  }
  if (Date.now() - c.at > REFRESH_MS && !c.inflight) {
    const load = async () => {
      const r = await fetch(`${IEM}?${spec.query}`)
      if (!r.ok) throw new Error(`IEM currents ${tier}: HTTP ${r.status}`)
      c.records = parseCurrents(await r.json(), spec.kind)
      c.at = Date.now()
    }
    c.inflight = load().finally(() => {
      c.inflight = null
    })
  }
  // The first request waits for data; later ones serve the warm set while
  // a refresh runs, and a failed refresh keeps the warm set rather than
  // blanking the map.
  if (c.at === 0 && c.inflight) await c.inflight
  else c.inflight?.catch(() => undefined)
  return c.records
}

/** Stations of the requested tiers inside `bbox` (all of them when null). */
export async function getIemObs(tiers, bbox) {
  const lists = await Promise.all(tiers.map(tierRecords))
  const all = lists.flat()
  return bbox ? all.filter((s) => inBbox(s, bbox)) : all
}
