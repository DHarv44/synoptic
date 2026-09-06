import { beforeEach, describe, expect, it } from 'vitest'
import { useTimeline } from '@/core/time/timelineStore'
import { createWarmthReporter } from '@/core/time/warmth'

const warm = () => useTimeline.getState().warmFrames

describe('warmth combiner', () => {
  beforeEach(() => {
    useTimeline.setState({ warmFrames: null })
  })

  it('a single reporter drives the store directly', () => {
    const r = createWarmthReporter('a')
    expect(warm()).toBe(0)
    r.report(5)
    expect(warm()).toBe(5)
    r.dispose()
    expect(warm()).toBeNull()
  })

  it('two reporters gate on the slower one', () => {
    const a = createWarmthReporter('a')
    const b = createWarmthReporter('b')
    a.report(8)
    b.report(3)
    expect(warm()).toBe(3)
    b.report(9)
    expect(warm()).toBe(8)
    b.dispose()
    expect(warm()).toBe(8)
    a.dispose()
    expect(warm()).toBeNull()
  })

  it('a fresh reporter starts at zero, holding the loop', () => {
    const a = createWarmthReporter('a')
    a.report(7)
    const b = createWarmthReporter('b')
    expect(warm()).toBe(0)
    a.dispose()
    b.dispose()
    expect(warm()).toBeNull()
  })
})
