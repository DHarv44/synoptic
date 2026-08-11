import { create } from 'zustand'
import { attachDevStore } from '@/dev/wx'
import type { UV } from '@/core/met/kinematics'
import type { RadarSite } from '@/features/radar/level2/sites'
import type { LatLon } from '@/features/radar/level2/geometry'
import type { ColumnEntry, SectionTilt, TiltInfo } from '@/features/radar/level2/worker'

export interface ProbeReadout {
  azDeg: number
  rangeM: number
  beamKft: number
  values: Record<string, number>
}

export interface SectionData {
  tilts: SectionTilt[]
  /** Ground range (m) of each sample along the line. */
  ranges: number[]
  lengthKm: number
}

interface RadarState {
  site: RadarSite | null
  tilts: TiltInfo[]
  elevNum: number
  moment: string
  raw: boolean
  srv: boolean
  storm: UV | null
  probe: ProbeReadout | null
  column: ColumnEntry[] | null
  section: SectionData | null
  sectionLine: LatLon[] | null
  set: (patch: Partial<RadarState>) => void
  resetSite: (site: RadarSite | null) => void
}

/**
 * Shared Level 2 state. The map layer is the only writer; the floating
 * bench, the readouts panel and the left-hand workbench all read from here
 * so the same volume drives every surface.
 */
export const useRadar = create<RadarState>((set) => ({
  site: null,
  tilts: [],
  elevNum: 1,
  moment: 'REF',
  raw: false,
  srv: false,
  storm: null,
  probe: null,
  column: null,
  section: null,
  sectionLine: null,
  set: (patch) => set(patch),
  resetSite: (site) =>
    set({ site, tilts: [], probe: null, column: null, section: null, sectionLine: null }),
}))

attachDevStore('radar', useRadar)
