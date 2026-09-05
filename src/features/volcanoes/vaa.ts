/**
 * Parser for VAAC Volcanic Ash Advisories (FV* bulletins) — the coded text
 * the nine ash advisory centres issue for aviation. Verified against live
 * Darwin bulletins 2026-09-05 (Krakatau, Semeru). Format:
 *
 *   VOLCANO: KRAKATAU 262000        ← name + Smithsonian volcano number
 *   PSN: S0606 E10525               ← degrees+minutes
 *   OBS VA CLD: SFC/FL200 S... E... - S... E... MOV SE 10KT SFC/FL500 ...
 *   FCST VA CLD +6 HR: 05/2210Z SFC/FL200 ...
 *
 * One section can stack several polygons, each opening with a flight-level
 * band and closing with an optional MOV clause. Lines wrap mid-list.
 */

export interface AshPolygon {
  /** e.g. 'SFC/FL500'. */
  levels: string
  points: Array<{ lat: number; lon: number }>
  /** e.g. 'W 30KT' when stated. */
  movement: string | null
}

export interface AshTimestep {
  /** 'OBS' | 'EST' | '+6' | '+12' | '+18'. */
  step: string
  polygons: AshPolygon[]
}

export interface VolcanicAshAdvisory {
  vaac: string
  volcanoName: string
  /** Smithsonian volcano number when stated (joins to the GVP database). */
  volcanoNumber: number | null
  position: { lat: number; lon: number } | null
  issuedMs: number | null
  eruptionDetails: string
  remarks: string
  timesteps: AshTimestep[]
  raw: string
}

/** S0806 → −8.1, E11255 → 112.9167 (degrees + minutes, variable width). */
export function decodeVaaCoord(tok: string): number | null {
  const m = /^([NSEW])(\d{3,5})$/.exec(tok)
  if (!m) return null
  const digits = m[2]
  // Latitude carries 2-digit degrees, longitude 3; minutes are the last two.
  const min = Number(digits.slice(-2))
  const deg = Number(digits.slice(0, -2))
  const val = deg + min / 60
  return m[1] === 'S' || m[1] === 'W' ? -val : val
}

function headerField(text: string, name: string): string {
  const re = new RegExp(`^${name}:\\s*(.*)$`, 'm')
  const m = re.exec(text)
  return m ? m[1].trim() : ''
}

/**
 * A section's body arrives as wrapped lines; polygons are read from the
 * token stream: a level band opens a polygon, N/S+E/W pairs joined by
 * dashes extend it, MOV closes it.
 */
function parsePolygons(body: string): AshPolygon[] {
  const tokens = body.replace(/-/g, ' ').split(/\s+/).filter(Boolean)
  const out: AshPolygon[] = []
  let current: AshPolygon | null = null
  let pendingLat: number | null = null
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]
    if (/^(SFC|FL\d{2,3})\/FL\d{2,3}$/.test(tok)) {
      current = { levels: tok, points: [], movement: null }
      out.push(current)
      pendingLat = null
      continue
    }
    if (current === null) continue
    if (tok === 'MOV') {
      const dir = tokens[i + 1] ?? ''
      const spd = /KT$/.test(tokens[i + 2] ?? '') ? ` ${tokens[i + 2]}` : ''
      current.movement = `${dir}${spd}`
      continue
    }
    const v = decodeVaaCoord(tok)
    if (v === null) continue
    if (tok.startsWith('N') || tok.startsWith('S')) {
      pendingLat = v
    } else if (pendingLat !== null) {
      current.points.push({ lat: pendingLat, lon: v })
      pendingLat = null
    }
  }
  return out.filter((p) => p.points.length >= 3)
}

/** DTG: 20260905/1630Z → epoch ms. */
function parseDtg(field: string): number | null {
  const m = /^(\d{4})(\d{2})(\d{2})\/(\d{2})(\d{2})Z/.exec(field)
  if (!m) return null
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]))
}

const SECTION_RE =
  /^(OBS VA CLD|EST VA CLD|FCST VA CLD \+6 HR|FCST VA CLD \+12 HR|FCST VA CLD \+18 HR):/

const STEP_NAMES: Record<string, string> = {
  'OBS VA CLD': 'OBS',
  'EST VA CLD': 'EST',
  'FCST VA CLD +6 HR': '+6',
  'FCST VA CLD +12 HR': '+12',
  'FCST VA CLD +18 HR': '+18',
}

export function parseVaa(raw: string): VolcanicAshAdvisory | null {
  if (!raw.includes('VA ADVISORY')) return null
  const volcanoField = headerField(raw, 'VOLCANO')
  if (volcanoField === '') return null
  const numMatch = /(\d{6})\s*$/.exec(volcanoField)
  const psn = headerField(raw, 'PSN').split(/\s+/)
  const lat = decodeVaaCoord(psn[0] ?? '')
  const lon = decodeVaaCoord(psn[1] ?? '')

  // Split the body into sections: a section runs from its header line to
  // the next ALL-CAPS "FIELD:" line at column 0.
  const timesteps: AshTimestep[] = []
  const lines = raw.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const m = SECTION_RE.exec(lines[i])
    if (!m) continue
    let body = lines[i].slice(lines[i].indexOf(':') + 1)
    for (let j = i + 1; j < lines.length && /^\s/.test(lines[j]); j++) body += ` ${lines[j]}`
    const polygons = parsePolygons(body)
    if (polygons.length > 0) timesteps.push({ step: STEP_NAMES[m[1]], polygons })
  }

  return {
    vaac: headerField(raw, 'VAAC'),
    volcanoName: volcanoField.replace(/\s*\d{6}\s*$/, '').trim(),
    volcanoNumber: numMatch ? Number(numMatch[1]) : null,
    position: lat !== null && lon !== null ? { lat, lon } : null,
    issuedMs: parseDtg(headerField(raw, 'DTG')),
    eruptionDetails: headerField(raw, 'ERUPTION DETAILS'),
    remarks: headerField(raw, 'RMK'),
    timesteps,
    raw,
  }
}

/**
 * The bulletin slots each VAAC publishes on tgftp — advisory files, not
 * per-volcano; stale slots carry old DTGs and are filtered by age. Surveyed
 * live 2026-09-05.
 */
export const VAA_SLOTS: string[] = [
  ...['01', '02', '03', '04', '05', '06', '07', '08'].map((n) => `fvau${n}.adrm..txt`), // Darwin
  ...['21', '22', '23', '24', '25'].map((n) => `fvak${n}.pawu..txt`), // Anchorage
  // Tokyo publishes a single slot; fvfe02-04 do not exist on tgftp.
  'fvfe01.rjtd..txt',
  ...['20', '21', '22', '23', '24', '25', '26', '27'].map((n) => `fvxx${n}.knes..txt`), // Washington
  ...['01', '02', '03', '04', '05'].map((n) => `fvxx${n}.lfpw..txt`), // Toulouse
  ...['01', '02', '05', '11'].map((n) => `fvxx${n}.egrr..txt`), // London
  ...['01', '02', '03', '04', '05'].map((n) => `fvag${n}.sabm..txt`), // Buenos Aires
]

/** Advisories older than this are a stale slot, not an active eruption. */
export const VAA_MAX_AGE_MS = 24 * 3600_000
