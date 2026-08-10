import { create } from 'zustand'
import type { SourceHealth, SourceRef, SourceStatus } from '@/core/data/types'
import { attachDevStore } from '@/dev/wx'

interface HealthState {
  sources: Record<string, SourceHealth>
  report: (ref: SourceRef, status: SourceStatus, error?: string) => void
}

/** Per-source connection health, rendered by the top-bar health strip. */
export const useHealth = create<HealthState>((set) => ({
  sources: {},
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
