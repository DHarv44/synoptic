import { reportError, reportOk, useHealth } from '@/core/data/healthStore'
import { fixtureActive, loadFixture } from '@/core/data/fixtures'
import type { SourceRef } from '@/core/data/types'

interface FetchJsonOptions {
  /** Fixture file name (without .json) used when fixture mode is active. */
  fixture?: string
  signal?: AbortSignal
}

/**
 * The one JSON fetch path for adapters: health reporting + fixture
 * substitution built in. Adapters never call fetch directly.
 */
export async function fetchJson<T>(
  source: SourceRef,
  url: string,
  opts: FetchJsonOptions = {},
): Promise<T> {
  if (fixtureActive() && opts.fixture !== undefined) {
    const data = await loadFixture<T>(opts.fixture)
    reportOk(source)
    return data
  }
  const { beginRequest, endRequest } = useHealth.getState()
  beginRequest()
  try {
    const res = await fetch(url, { signal: opts.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as T
    reportOk(source)
    return data
  } catch (e) {
    reportError(source, e instanceof Error ? e.message : String(e))
    throw e
  } finally {
    endRequest()
  }
}
