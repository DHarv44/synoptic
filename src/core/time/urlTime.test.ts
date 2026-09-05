import { describe, expect, it } from 'vitest'
import { formatTimeHash, parseTimeHash } from '@/core/time/urlTime'

describe('time hash', () => {
  it('round-trips a UTC minute', () => {
    const ms = Date.parse('2026-09-05T05:40:00Z')
    expect(formatTimeHash(ms)).toBe('#t=2026-09-05T05:40Z')
    expect(parseTimeHash(formatTimeHash(ms))).toBe(ms)
  })

  it('truncates seconds when formatting', () => {
    expect(formatTimeHash(Date.parse('2026-09-05T05:40:59Z'))).toBe('#t=2026-09-05T05:40Z')
  })

  it('rejects hashes that are not a time', () => {
    expect(parseTimeHash('')).toBeNull()
    expect(parseTimeHash('#view=1,2,3')).toBeNull()
    expect(parseTimeHash('#t=yesterday')).toBeNull()
    expect(parseTimeHash('#t=2026-99-99T99:99Z')).toBeNull()
  })

  it('finds t among other hash params', () => {
    expect(parseTimeHash('#foo=bar&t=2026-09-05T05:40Z')).toBe(Date.parse('2026-09-05T05:40Z'))
  })
})
