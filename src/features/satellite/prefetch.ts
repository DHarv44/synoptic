/**
 * Warm the browser cache for the satellite frames a loop will play, oldest
 * first, reporting per loop frame. A 10-minute product under a 5-minute loop
 * repeats URLs — the shared Set makes the repeat frame instantly ready.
 * Responses are discarded; the point is the HTTP cache entry. Failures are
 * ignored: a frame that misses simply loads normally when reached.
 */

const LANES = 6

export async function warmXyzFrames(
  urlsPerFrame: string[][],
  signal: AbortSignal,
  onFrameReady: (count: number) => void,
): Promise<void> {
  const fetched = new Set<string>()
  for (let frame = 0; frame < urlsPerFrame.length; frame++) {
    if (signal.aborted) return
    const urls = urlsPerFrame[frame].filter((u) => !fetched.has(u))
    let next = 0
    const lane = async (): Promise<void> => {
      while (next < urls.length && !signal.aborted) {
        const url = urls[next++]
        try {
          const res = await fetch(url, { signal })
          await res.blob()
          fetched.add(url)
        } catch {
          // Aborted, offline, or a missing frame — not worth reporting.
        }
      }
    }
    await Promise.all(Array.from({ length: LANES }, lane))
    if (!signal.aborted) onFrameReady(frame + 1)
  }
}
