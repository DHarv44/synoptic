import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { attachDevStore } from '@/dev/wx'

export const MIN_TOOL_PCT = 20
export const MAX_TOOL_PCT = 70

interface ToolState {
  /** Active tool id, or null when the left panel is closed. */
  active: string | null
  /** Panel width as a percentage of the viewport. */
  widthPct: number
  toggle: (id: string) => void
  close: () => void
  setWidthPct: (pct: number) => void
}

/** Left tool panel: which workbench is open and how much room it takes. */
export const useTools = create<ToolState>()(
  persist(
    (set) => ({
      active: null,
      widthPct: 40,
      toggle: (id) => set((s) => ({ active: s.active === id ? null : id })),
      close: () => set({ active: null }),
      setWidthPct: (pct) =>
        set({ widthPct: Math.min(MAX_TOOL_PCT, Math.max(MIN_TOOL_PCT, pct)) }),
    }),
    { name: 'synoptic.tools', version: 1 },
  ),
)

attachDevStore('tools', useTools)
