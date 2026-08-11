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

/** `SITE/VOL/YYYYMMDD-HHMMSS-SEQ-KIND` */
const KEY_RE = /\/(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})-(\d{3})-([SIE])$/

/** Collection time encoded in the chunk key, or null if it doesn't parse. */
export function chunkKeyTime(key: string): number | null {
  const m = KEY_RE.exec(key)
  if (!m) return null
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
}

/**
 * A volume never spans this long, so anything older than the newest chunk by
 * more than this belongs to an earlier pass of the ring.
 */
const PASS_WINDOW_MS = 2 * 3600_000

/**
 * Chunks of one volume, ascending sequence — and only from the current pass.
 *
 * Volume prefixes wrap 0–999 and the old objects are not deleted, so a busy
 * site reuses a prefix every few days while the previous pass is still
 * sitting there. Listing the prefix returns both, and since the stale pass
 * owns the low sequence numbers it sorts first, meaning the start chunk —
 * the one that resets the sweep store — could be days old. Observed on KJKL:
 * prefix 132 held a start chunk from three days earlier next to live ones,
 * and the display quietly showed three-day-old weather.
 */
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
  return currentPassChunks(out)
}

/** Chunks belonging to the newest pass, ascending sequence. */
export function currentPassChunks(chunks: ChunkRef[]): ChunkRef[] {
  // Prefer the key's own collection time; fall back to upload time.
  const timeOf = (c: ChunkRef): number => chunkKeyTime(c.key) ?? c.lastModified
  const newest = chunks.reduce((max, c) => Math.max(max, timeOf(c)), 0)
  return chunks
    .filter((c) => newest - timeOf(c) <= PASS_WINDOW_MS)
    .sort((a, b) => a.seq - b.seq)
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
