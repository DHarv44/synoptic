import { create } from 'zustand'
import { createSharedFeed } from '@/core/data/sharedFeed'
import {
  USGS_VOLCANO,
  VAAC,
  fetchAshAdvisories,
  fetchElevatedUs,
  type UsgsNotice,
  type VolcanoQuake,
} from '@/features/volcanoes/service'
import type { VolcanicAshAdvisory } from '@/features/volcanoes/vaa'

/** Ash advisories and US alert notices feed the layer, panel and summary. */
const advisoryFeed = createSharedFeed<VolcanicAshAdvisory[]>({
  source: VAAC,
  cadenceMs: 10 * 60_000,
  featureId: 'volcanoes',
  fetcher: () => fetchAshAdvisories(Date.now()),
})

const usgsFeed = createSharedFeed<UsgsNotice[]>({
  source: USGS_VOLCANO,
  cadenceMs: 10 * 60_000,
  featureId: 'volcanoes',
  fetcher: fetchElevatedUs,
})

export const acquireAdvisoryFeed = advisoryFeed.acquire
export const acquireUsgsFeed = usgsFeed.acquire

export function useAdvisories(): VolcanicAshAdvisory[] {
  return advisoryFeed.useData((s) => s.data) ?? []
}

export function useUsgsNotices(): UsgsNotice[] {
  return usgsFeed.useData((s) => s.data) ?? []
}

/**
 * Seismicity being inspected: set by an open volcano card, cleared when it
 * closes, drawn by the layer as a transient halo of quake dots. Volcano
 * number keys it so a second card cleanly replaces the first.
 */
interface InspectState {
  volcanoNumber: number | null
  quakes: VolcanoQuake[]
  setInspect: (volcanoNumber: number, quakes: VolcanoQuake[]) => void
  clearInspect: (volcanoNumber: number) => void
}

export const useInspect = create<InspectState>((set) => ({
  volcanoNumber: null,
  quakes: [],
  setInspect: (volcanoNumber, quakes) => set({ volcanoNumber, quakes }),
  clearInspect: (volcanoNumber) =>
    set((s) => (s.volcanoNumber === volcanoNumber ? { volcanoNumber: null, quakes: [] } : s)),
}))
