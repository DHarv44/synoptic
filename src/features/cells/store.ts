import { fetchJson } from '@/core/data/fetchJson'
import { createSharedFeed } from '@/core/data/sharedFeed'
import { ATTR_URL, IEM_ATTR, sortCells, type AttrResponse, type CellFeature } from '@/features/cells/service'

const feed = createSharedFeed<CellFeature[]>({
  source: IEM_ATTR,
  cadenceMs: 2 * 60_000,
  featureId: 'cells',
  fetcher: async () => {
    const res = await fetchJson<AttrResponse>(IEM_ATTR, ATTR_URL, { fixture: 'nexrad-attr' })
    return sortCells(res.features)
  },
})

export const acquireCellsFeed = feed.acquire

/** Severity-sorted storm cells (empty until the first poll lands). */
export function useCellsData(): CellFeature[] {
  return feed.useData((s) => s.data) ?? []
}
