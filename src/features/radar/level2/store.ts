import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
  /** Collection time of the displayed sweep, ms UTC; 0 before one arrives. */
  scanTimeMs: number
  /** Volume coverage pattern; 0 until a volume header is seen. */
  vcp: number
  probe: ProbeReadout | null
  column: ColumnEntry[] | null
  section: SectionData | null
  sectionLine: LatLon[] | null
  /** Cross-section drawing mode: awaiting two map clicks. */
  drawing: boolean
  drawStart: LatLon | null
  /**
   * Pinned to a chosen site instead of following the map. Panning near a
   * boundary otherwise swaps sites and discards the probe and section, so
   * anyone working one storm wants this on.
   */
  locked: boolean
  set: (patch: Partial<RadarState>) => void
  resetSite: (site: RadarSite | null) => void
  /** Choose a site by hand. Implies a lock — otherwise the next map move
   *  would immediately undo the choice. */
  pickSite: (site: RadarSite) => void
  setLocked: (on: boolean) => void
  startDraw: () => void
  cancelDraw: () => void
}

/** Everything tied to one site's volume, dropped when the site changes. */
const CLEARED = {
  tilts: [],
  scanTimeMs: 0,
  vcp: 0,
  probe: null,
  column: null,
  section: null,
  sectionLine: null,
  drawing: false,
  drawStart: null,
} satisfies Partial<RadarState>

/**
 * Shared Level 2 state. The map layer owns the stream; the controls,
 * readouts panel and left-hand workbench all read from here so the same
 * volume drives every surface.
 */
export const useRadar = create<RadarState>()(
  persist(
    (set) => ({
      site: null,
      tilts: [],
      elevNum: 1,
      moment: 'REF',
      raw: false,
      srv: false,
      storm: null,
      scanTimeMs: 0,
      vcp: 0,
      probe: null,
      column: null,
      section: null,
      sectionLine: null,
      drawing: false,
      drawStart: null,
      locked: false,
      set: (patch) => set(patch),
      resetSite: (site) => set({ site, ...CLEARED }),
      pickSite: (site) => set({ site, locked: true, ...CLEARED }),
      setLocked: (on) => set({ locked: on }),
      startDraw: () => set({ drawing: true, drawStart: null, sectionLine: null, section: null }),
      cancelDraw: () => set({ drawing: false, drawStart: null, sectionLine: null }),
    }),
    {
      name: 'synoptic.radar',
      version: 1,
      /**
       * Only the choices, never the volume. Sweeps, probes and sections all
       * belong to one download and are meaningless next session. The site is
       * kept only when locked: unlocked, the map picks it on the first move,
       * so restoring one would start a worker on a site about to be replaced.
       */
      partialize: (s) => ({
        locked: s.locked,
        site: s.locked ? s.site : null,
        elevNum: s.elevNum,
        moment: s.moment,
        raw: s.raw,
        srv: s.srv,
      }),
    },
  ),
)

attachDevStore('radar', useRadar)
