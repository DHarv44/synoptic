import type { SourceRef } from '@/core/data/types'

export const IEM_ATTR: SourceRef = { id: 'iem-attr', label: 'NEXRAD storm attributes' }

export const ATTR_URL = 'https://mesonet.agron.iastate.edu/geojson/nexrad_attr.geojson'

export interface CellProps {
  nexrad: string
  storm_id: string
  tvs: string // 'NONE' | 'TVS' | …
  meso: string // 'NONE' | rank
  posh: number // prob severe hail %
  poh: number // prob hail %
  max_size: number // hail inches
  vil: number
  max_dbz: number
  max_dbz_height: number // kft
  top: number // kft
  drct: number // motion from, deg
  sknt: number // motion, kt
  valid: string
}

export interface CellFeature {
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: CellProps
}

export interface AttrResponse {
  features: CellFeature[]
}

/** 0 = quiet … 3 = TVS. Drives color + sort. */
export function cellSeverity(p: CellProps): number {
  if (p.tvs !== 'NONE') return 3
  if (p.meso !== 'NONE') return 2
  if (p.max_size >= 1 || p.posh >= 50) return 1
  return 0
}

export const SEVERITY_COLORS = ['#4dabf7', '#fab005', '#ff922b', '#fa5252']

/** Severity then intensity ordering for the table. */
export function sortCells(cells: CellFeature[]): CellFeature[] {
  return [...cells].sort((a, b) => {
    const s = cellSeverity(b.properties) - cellSeverity(a.properties)
    if (s !== 0) return s
    return b.properties.max_dbz - a.properties.max_dbz
  })
}
