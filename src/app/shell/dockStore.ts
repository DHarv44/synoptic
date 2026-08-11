import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PanelGroup } from '@/core/settings/types'
import { attachDevStore } from '@/dev/wx'

export type DockTab = PanelGroup | 'settings'

/** Mobile sheet heights: summary only, map + panel, or panel only. */
export type SheetState = 'peek' | 'half' | 'full'

interface DockState {
  tab: DockTab
  open: boolean
  sheet: SheetState
  setSheet: (sheet: SheetState) => void
  /** Mobile tab press: same tab cycles the sheet, a new tab opens it. */
  pressTab: (tab: DockTab) => void
  /** Section id → expanded. Absent means expanded (the default). */
  expanded: Record<string, boolean>
  setTab: (tab: DockTab) => void
  toggleOpen: () => void
  show: (tab: DockTab) => void
  /** Rail click: same tab collapses the panel, a different tab switches. */
  toggleTab: (tab: DockTab) => void
  toggleSection: (id: string) => void
}

/**
 * Analysis-dock state: which tab, whether it's open, and each tab's
 * section order + expansion. Sections start collapsed so the contextual
 * header carries the summary and depth is one click away.
 */
export const useDock = create<DockState>()(
  persist(
    (set) => ({
      tab: 'place',
      open: true,
      sheet: 'peek',
      expanded: {},
      setSheet: (sheet) => set({ sheet }),
      pressTab: (tab) =>
        set((s) =>
          s.tab === tab && s.sheet !== 'peek'
            ? { sheet: 'peek' }
            : { tab, sheet: s.sheet === 'peek' ? 'half' : s.sheet },
        ),
      setTab: (tab) => set({ tab }),
      toggleOpen: () => set((s) => ({ open: !s.open })),
      show: (tab) => set({ tab, open: true }),
      toggleTab: (tab) =>
        set((s) => (s.open && s.tab === tab ? { open: false } : { tab, open: true })),
      toggleSection: (id) =>
        set((s) => ({ expanded: { ...s.expanded, [id]: !(s.expanded[id] ?? true) } })),
    }),
    { name: 'synoptic.dock', version: 2 },
  ),
)

attachDevStore('dock', useDock)
