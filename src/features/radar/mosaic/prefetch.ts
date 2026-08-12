/**
 * Warm the browser cache for the frames a loop is about to play.
 *
 * Cold, a frame's tiles take ~800 ms to arrive; already cached, ~7 ms. So the
 * first pass of a loop is entirely network-bound and stutters, while every
 * later pass is effectively free. Fetching the frames ahead of time removes
 * the difference — the requests are identical to the ones MapLibre will make,
 * so they land in the same HTTP cache entries.
 *
 * The tile geometry comes from MapLibre itself rather than from re-deriving
 * its tile-covering maths: the protocol handler already sees every URL it
 * asks for, so the bboxes it requested for the current frame are exactly the
 * ones the other frames need.
 */

/** bbox → when it was last requested. */
const seen = new Map<string, number>()

/**
 * How long a bbox stays interesting after its last request. Long enough to
 * cover a viewport finishing its tiles, short enough that the previous
 * viewport is gone by the time the next prefetch runs.
 */
const RECENT_MS = 12_000

/**
 * Upper bound on bboxes per sweep. A zoom change briefly leaves parent and
 * child tiles both live, and every extra bbox is multiplied by the frame
 * count — so this caps the blast radius at roughly two viewports' worth.
 */
const MAX_BBOXES = 48

/** Concurrency cap, so prefetching never starves the frame on screen. */
const LANES = 6

const BBOX_RE = /[?&]BBOX=([^&]+)/

export function noteRequestedUrl(url: string): void {
  const bbox = BBOX_RE.exec(url)?.[1]
  if (!bbox) return
  // Re-inserting keeps the map in recency order, which is what MAX_BBOXES
  // trims against — a Map keeps insertion order, not update order.
  seen.delete(bbox)
  seen.set(bbox, Date.now())
}

/**
 * Bboxes requested recently, most recent last. Panning naturally replaces
 * them: new ones are recorded as they load and stale ones age out, so this
 * tracks the viewport without watching the map.
 */
export function recentBboxes(nowMs = Date.now()): string[] {
  const out: string[] = []
  for (const [bbox, at] of seen) {
    if (nowMs - at <= RECENT_MS) out.push(bbox)
    else seen.delete(bbox)
  }
  return out.slice(-MAX_BBOXES)
}

/**
 * Fetch every frame's tiles for the current viewport, nearest frame first.
 * Responses are dropped on the floor — the point is the cache entry, not the
 * bytes. Failures are ignored: this is an optimisation, and a frame that
 * misses simply loads normally when it is reached.
 */
export async function prefetchFrames(
  urlFor: (bbox: string, index: number) => string,
  frameCount: number,
  signal: AbortSignal,
): Promise<void> {
  const bboxes = recentBboxes()
  if (bboxes.length === 0) return

  const jobs: string[] = []
  for (let i = 0; i < frameCount; i++) for (const b of bboxes) jobs.push(urlFor(b, i))

  let next = 0
  const lane = async (): Promise<void> => {
    while (next < jobs.length && !signal.aborted) {
      const url = jobs[next++]
      try {
        const res = await fetch(url, { signal })
        await res.blob()
      } catch {
        // Aborted, offline, or a bad frame — none of it is worth reporting.
      }
    }
  }
  await Promise.all(Array.from({ length: LANES }, lane))
}
