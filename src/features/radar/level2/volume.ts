/**
 * Chunk-bucket client: find a site's current volume and its chunks.
 * Volume prefixes wrap 0–999, so "current" = the prefix whose newest
 * chunk has the max LastModified (coarse sample → walk forward).
 */

const PROXY = '/proxy/nexrad'

export interface ChunkRef {
  key: string
  lastModified: number
  /** S(tart) | I(ntermediate) | E(nd) */
  kind: 'S' | 'I' | 'E'
  seq: number
}

async function listXml(query: string): Promise<Document> {
  const res = await fetch(`${PROXY}/?list-type=2&${query}`)
  if (!res.ok) throw new Error(`bucket list HTTP ${res.status}`)
  return new DOMParser().parseFromString(await res.text(), 'text/xml')
}

/** Chunks of one volume, ascending sequence. */
export async function listVolumeChunks(site: string, volume: number): Promise<ChunkRef[]> {
  const doc = await listXml(`prefix=${site}/${volume}/`)
  const out: ChunkRef[] = []
  for (const c of Array.from(doc.getElementsByTagName('Contents'))) {
    const key = c.getElementsByTagName('Key')[0]?.textContent ?? ''
    const lm = Date.parse(c.getElementsByTagName('LastModified')[0]?.textContent ?? '')
    const m = /-(\d{3})-([SIE])$/.exec(key)
    if (!m) continue
    out.push({ key, lastModified: lm, kind: m[2] as ChunkRef['kind'], seq: Number(m[1]) })
  }
  return out.sort((a, b) => a.seq - b.seq)
}

async function newestIn(site: string, volume: number): Promise<number> {
  const chunks = await listVolumeChunks(site, volume)
  return chunks.length === 0 ? 0 : Math.max(...chunks.map((c) => c.lastModified))
}

/**
 * Locate the current volume: sample the ring coarsely, then walk forward
 * from the freshest sample until staleness. ~12–18 list calls, cache it.
 */
export async function findCurrentVolume(site: string): Promise<number> {
  const samples = [1, 84, 167, 250, 334, 417, 500, 584, 667, 750, 834, 917]
  const times = await Promise.all(samples.map((v) => newestIn(site, v)))
  let best = samples[times.indexOf(Math.max(...times))]
  let bestT = Math.max(...times)
  for (let i = 0; i < 100; i++) {
    const next = (best % 999) + 1
    const t = await newestIn(site, next)
    if (t <= bestT) break
    best = next
    bestT = t
  }
  if (bestT === 0) throw new Error(`no volumes for ${site}`)
  return best
}

export async function fetchChunk(ref: ChunkRef): Promise<ArrayBuffer> {
  const res = await fetch(`${PROXY}/${ref.key}`)
  if (!res.ok) throw new Error(`chunk HTTP ${res.status}`)
  return res.arrayBuffer()
}
