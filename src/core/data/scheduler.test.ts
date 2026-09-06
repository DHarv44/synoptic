import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startPoller } from '@/core/data/scheduler'
import { useSettings } from '@/core/settings/store'

const SOURCE = { id: 'test-src', label: 'Test' }
const CADENCE = 10 * 60_000

beforeEach(() => {
  vi.useFakeTimers()
  // Node test env: the poller only reads `document.hidden` and hangs a
  // visibilitychange listener, so a stub that small is the honest shim.
  vi.stubGlobal('document', { hidden: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  useSettings.getState().setEnabled('poller-test', false)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('startPoller', () => {
  it('runs immediately when enabled', async () => {
    const run = vi.fn(async () => {})
    const stop = startPoller({ source: SOURCE, cadenceMs: CADENCE, enabled: () => true, run })
    await vi.advanceTimersByTimeAsync(0)
    expect(run).toHaveBeenCalledTimes(1)
    stop()
  })

  it('parks without running while disabled', async () => {
    const run = vi.fn(async () => {})
    const stop = startPoller({ source: SOURCE, cadenceMs: CADENCE, enabled: () => false, run })
    await vi.advanceTimersByTimeAsync(CADENCE / 2)
    expect(run).not.toHaveBeenCalled()
    stop()
  })

  it('wakes the moment its feature is enabled instead of waiting a cadence', async () => {
    const run = vi.fn(async () => {})
    const enabled = (): boolean => useSettings.getState().features['poller-test']?.enabled === true
    const stop = startPoller({ source: SOURCE, cadenceMs: CADENCE, enabled, run })
    await vi.advanceTimersByTimeAsync(1000)
    expect(run).not.toHaveBeenCalled()

    useSettings.getState().setEnabled('poller-test', true)
    await vi.advanceTimersByTimeAsync(0)
    expect(run).toHaveBeenCalledTimes(1)
    stop()
  })

  it('does not double-run when settings change while already active', async () => {
    const run = vi.fn(async () => {})
    const stop = startPoller({ source: SOURCE, cadenceMs: CADENCE, enabled: () => true, run })
    await vi.advanceTimersByTimeAsync(0)
    useSettings.getState().setEnabled('poller-test', true)
    useSettings.getState().setEnabled('poller-test', false)
    await vi.advanceTimersByTimeAsync(0)
    expect(run).toHaveBeenCalledTimes(1)
    stop()
  })

  it('stops listening once stopped', async () => {
    const run = vi.fn(async () => {})
    const enabled = (): boolean => useSettings.getState().features['poller-test']?.enabled === true
    const stop = startPoller({ source: SOURCE, cadenceMs: CADENCE, enabled, run })
    await vi.advanceTimersByTimeAsync(0)
    stop()
    useSettings.getState().setEnabled('poller-test', true)
    await vi.advanceTimersByTimeAsync(0)
    expect(run).not.toHaveBeenCalled()
  })
})
