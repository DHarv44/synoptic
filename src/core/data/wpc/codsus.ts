/**
 * Parser for CODSUS — WPC's coded surface frontal positions bulletin
 * (ASUS02 KWBC). The only machine-readable form of the surface analysis
 * fronts that needs no key and no shapefile tooling.
 *
 * Shape of the product: keyword-led sections that wrap freely across lines,
 * so parsing is token-stream, not line-by-line. Coordinates are 7 digits —
 * lat×10 then lon×10 — with west longitude implied positive in the text:
 * `4210910` is 42.1° N, 91.0° W.
 */

export interface Front {
  kind: 'cold' | 'warm' | 'stationary' | 'occluded' | 'trough'
  /** WK / MDT / STG when the bulletin grades it; troughs never are. */
  strength: string | null
  points: Array<{ lat: number; lon: number }>
}

export interface PressureCenter {
  kind: 'high' | 'low'
  pressure: number
  lat: number
  lon: number
}

export interface SurfaceAnalysis {
  /** e.g. "081521Z" — day-of-month, hour, minute. Raw, display-only. */
  validTime: string | null
  fronts: Front[]
  centers: PressureCenter[]
}

const FRONT_KINDS: Record<string, Front['kind']> = {
  COLD: 'cold',
  WARM: 'warm',
  STNRY: 'stationary',
  OCFNT: 'occluded',
  TROF: 'trough',
}

const STRENGTHS = new Set(['WK', 'MDT', 'STG'])

/**
 * Two point formats share the CODSUS pil: the main-cycle ASUS02 codes
 * tenths as 7 digits (lat×10 then zero-padded lon×10, `2870883` → 28.7N
 * 88.3W); the interim overnight ASUS01 codes whole degrees as 4–5 digits
 * (2-digit lat then lon, `4474` → 44N 74W, `38112` → 38N 112W). The
 * overnight chart parsed to nothing until both were handled.
 */
function decodePoint(tok: string): { lat: number; lon: number } {
  if (tok.length === 7) {
    return { lat: Number(tok.slice(0, 3)) / 10, lon: -Number(tok.slice(3)) / 10 }
  }
  return { lat: Number(tok.slice(0, 2)), lon: -Number(tok.slice(2)) }
}

/** A coordinate token in either resolution. */
const POINT_RE = /^\d{4}$|^\d{5}$|^\d{7}$/

export function parseCodsus(text: string): SurfaceAnalysis {
  const out: SurfaceAnalysis = { validTime: null, fronts: [], centers: [] }
  /** 'highs' | 'lows' | Front currently collecting, or null outside sections. */
  let section: 'highs' | 'lows' | Front | null = null
  /** Pressure waiting for its coordinate while in a centers section. */
  let pending: number | null = null

  for (const rawLine of text.split('\n')) {
    const tokens = rawLine.trim().split(/\s+/).filter(Boolean)
    for (const tok of tokens) {
      if (tok === 'VALID') {
        section = null
        continue
      }
      if (/^\d{6}Z$/.test(tok)) {
        out.validTime = tok
        continue
      }
      if (tok === 'HIGHS' || tok === 'LOWS') {
        section = tok === 'HIGHS' ? 'highs' : 'lows'
        pending = null
        continue
      }
      if (tok in FRONT_KINDS) {
        const front: Front = { kind: FRONT_KINDS[tok], strength: null, points: [] }
        out.fronts.push(front)
        section = front
        continue
      }
      if (section === null) continue

      if (typeof section === 'object') {
        if (STRENGTHS.has(tok) && section.points.length === 0) {
          section.strength = tok
        } else if (POINT_RE.test(tok)) {
          section.points.push(decodePoint(tok))
        }
        continue
      }

      // Centers: alternating 3–4 digit pressures and coordinates. A 4-digit
      // token is a pressure or a whole-degree point — the alternation
      // (pending set or not) is what disambiguates.
      if (POINT_RE.test(tok) && pending !== null) {
        const { lat, lon } = decodePoint(tok)
        out.centers.push({
          kind: section === 'highs' ? 'high' : 'low',
          pressure: pending,
          lat,
          lon,
        })
        pending = null
      } else if (/^\d{3,4}$/.test(tok)) {
        pending = Number(tok)
      }
    }
  }

  // A one-point front draws nothing and usually means a truncated bulletin.
  out.fronts = out.fronts.filter((f) => f.points.length >= 2)
  return out
}
