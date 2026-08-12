/**
 * Warm the browser cache for the frames a loop is about to play, and report
 * how much of the loop is ready.
 *
 * Cold, a frame's tiles take ~800 ms at wide zoom and ~12 s zoomed in;
 * cached, ~11 ms. So a loop that advances on a timer regardless will stutter
 * through cold frames and then lurch as several land at once. Frames are
 * warmed oldest-first, one at a time, so `readyFrameCount` grows in loop
 * order and playback can cycle the part that is ready while the rest fills.
 *
 * The tile geometry comes from MapLibre itself rather than from re-deriving
 * its tile-covering maths: the protocol handler already sees every URL it
 * asks for, so the bboxes it requested are exactly the ones other frames
 * need.
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
 * Upper bound on bboxes per sweep. Every extra bbox is multiplied by the
 * frame count, so this caps the blast radius at roughly two viewports.
 */
const MAX_BBOXES = 64

/** Concurrency within a frame. */
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

/** Width of a `west,south,east,north` bbox, which is constant per zoom. */
function width(bbox: string): number {
  const p = bbox.split(',')
  return Math.round(Number(p[2]) - Number(p[0]))
}

/**
 * Bboxes worth warming: the finest group only.
 *
 * MapLibre keeps coarser tiles alive as overzoom fallback, and a recent
 * zoom leaves the previous level's tiles in the registry too. Measured at
 * z10: 105 bboxes across two sizes, only 56 of them at display resolution.
 * Warming the rest costs a full extra sweep for tiles that are never shown.
 */
export function recentBboxes(nowMs = Date.now()): string[] {
  const live: string[] = []
  for (const [bbox, at] of seen) {
    if (nowMs - at <= RECENT_MS) live.push(bbox)
    else seen.delete(bbox)
  }
  if (live.length === 0) return live
  const finest = Math.min(...live.map(width))
  return live.filter((b) => width(b) === finest).slice(-MAX_BBOXES)
}

/**
 * Warm every frame for the current viewport, oldest first, one frame at a
 * time so `readyFrameCount` advances in the order playback needs.
 *
 * Responses are dropped on the floor — the point is the cache entry, not the
 * bytes. Failures are ignored: this is an optimisation, and a frame that
 * misses simply loads normally when it is reached.
 */
export async function prefetchFrames(
  urlFor: (bbox: string, index: number) => string,
  frameCount: number,
  signal: AbortSignal,
  onFrameReady?: (count: number) => void,
): Promise<void> {
  const bboxes = recentBboxes()
  if (bboxes.length === 0) return

  for (let frame = 0; frame < frameCount; frame++) {
    if (signal.aborted) return
    let next = 0
    const lane = async (): Promise<void> => {
      while (next < bboxes.length && !signal.aborted) {
        try {
          const res = await fetch(urlFor(bboxes[next++], frame), { signal })
          await res.blob()
        } catch {
          // Aborted, offline, or a bad frame — none of it is worth reporting.
        }
      }
    }
    await Promise.all(Array.from({ length: LANES }, lane))
    if (!signal.aborted) onFrameReady?.(frame + 1)
  }
}
