import { describe, expect, it } from 'vitest'
import { chunkKeyTime, currentPassChunks, type ChunkRef } from '@/features/radar/level2/volume'

function chunk(key: string, lastModified = 0): ChunkRef {
  const m = /-(\d{3})-([SIE])$/.exec(key)
  return {
    key,
    lastModified,
    kind: (m?.[2] ?? 'I') as ChunkRef['kind'],
    seq: Number(m?.[1] ?? 0),
  }
}

describe('chunkKeyTime', () => {
  it('reads the collection time out of the key, as UTC', () => {
    expect(chunkKeyTime('KJKL/132/20260811-214432-098-I')).toBe(
      Date.parse('2026-08-11T21:44:32Z'),
    )
  })

  it('is null for keys that do not match', () => {
    expect(chunkKeyTime('KJKL/132/garbage')).toBeNull()
    expect(chunkKeyTime('')).toBeNull()
  })
})

describe('currentPassChunks', () => {
  it('drops chunks left over from an earlier pass of the ring', () => {
    // Real shape observed on KJKL/132: a three-day-old start chunk sitting
    // beside live ones. It owns seq 001, so it sorts first and would reset
    // the sweep store with three-day-old radials.
    const chunks = [
      chunk('KJKL/132/20260809-005724-001-S'),
      chunk('KJKL/132/20260809-005830-002-I'),
      chunk('KJKL/132/20260811-214300-096-I'),
      chunk('KJKL/132/20260811-214432-098-I'),
    ]
    const kept = currentPassChunks(chunks)
    expect(kept.map((c) => c.seq)).toEqual([96, 98])
    expect(kept.every((c) => c.key.includes('20260811'))).toBe(true)
  })

  it('keeps a whole volume — passes span minutes, not hours', () => {
    const chunks = [
      chunk('KJKL/132/20260811-210000-001-S'),
      chunk('KJKL/132/20260811-210500-050-I'),
      chunk('KJKL/132/20260811-211000-099-E'),
    ]
    expect(currentPassChunks(chunks)).toHaveLength(3)
  })

  it('sorts by sequence, not by listing order', () => {
    const chunks = [
      chunk('KJKL/132/20260811-210500-050-I'),
      chunk('KJKL/132/20260811-210000-001-S'),
    ]
    expect(currentPassChunks(chunks).map((c) => c.seq)).toEqual([1, 50])
  })

  it('falls back to upload time when the key has no timestamp', () => {
    const now = Date.parse('2026-08-11T21:00:00Z')
    const chunks = [
      chunk('KJKL/132/odd-001-S', now - 5 * 3600_000),
      chunk('KJKL/132/odd-002-I', now),
    ]
    expect(currentPassChunks(chunks).map((c) => c.seq)).toEqual([2])
  })

  it('handles an empty listing', () => {
    expect(currentPassChunks([])).toEqual([])
  })
})
