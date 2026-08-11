import { create } from 'zustand'
import type { SourceHealth, SourceRef, SourceStatus } from '@/core/data/types'
import { attachDevStore } from '@/dev/wx'

interface HealthState {
  sources: Record<string, SourceHealth>
  /** Outstanding data requests across all sources. */
  inFlight: number
  /** Map tiles/sources still loading (MapLibre reports this separately). */
  mapBusy: boolean
  report: (ref: SourceRef, status: SourceStatus, error?: string) => void
  beginRequest: () => void
  endRequest: () => void
  setMapBusy: (busy: boolean) => void
}

/** Per-source connection health, rendered by the top-bar health strip. */
export const useHealth = create<HealthState>((set) => ({
  sources: {},
  inFlight: 0,
  mapBusy: false,
  beginRequest: () => set((s) => ({ inFlight: s.inFlight + 1 })),
  endRequest: () => set((s) => ({ inFlight: Math.max(0, s.inFlight - 1) })),
  setMapBusy: (mapBusy) => set({ mapBusy }),
  report: (ref, status, error) =>
    set((s) => {
      const prev = s.sources[ref.id]
      return {
        sources: {
          ...s.sources,
          [ref.id]: {
            ...ref,
            status,
            lastSuccess: status === 'ok' ? Date.now() : prev?.lastSuccess,
            lastError: status === 'error' ? error : undefined,
          },
        },
      }
    }),
}))

export function reportOk(ref: SourceRef): void {
  useHealth.getState().report(ref, 'ok')
}

export function reportError(ref: SourceRef, error: string): void {
  useHealth.getState().report(ref, 'error', error)
}

export function reportDisabled(ref: SourceRef): void {
  useHealth.getState().report(ref, 'disabled')
}

attachDevStore('health', useHealth)
