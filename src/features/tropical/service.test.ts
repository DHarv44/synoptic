import { describe, expect, it } from 'vitest'
import { motionText, stormCategory, validTimeMs } from '@/features/tropical/service'

describe('stormCategory', () => {
  it('grades hurricanes on Saffir-Simpson thresholds', () => {
    expect(stormCategory('HU', 80).label).toBe('Cat 1')
    expect(stormCategory('HU', 83).label).toBe('Cat 2')
    expect(stormCategory('HU', 110).label).toBe('Cat 3')
    expect(stormCategory('HU', 113).label).toBe('Cat 4')
    expect(stormCategory('HU', 140).key).toBe('C5')
  })

  it('keeps storms, depressions and the subtropical/post-tropical kinds distinct', () => {
    expect(stormCategory('TS', 50)).toEqual({ key: 'TS', label: 'Tropical storm' })
    expect(stormCategory('TD', 30).key).toBe('TD')
    expect(stormCategory('STS', 45).label).toBe('Subtropical storm')
    expect(stormCategory('EX', 40).label).toBe('Post-tropical')
    expect(stormCategory('PTC', 35).key).toBe('other')
  })
})

describe('validTimeMs', () => {
  const issued = Date.UTC(2026, 8, 6, 9) // 06 Sep 09Z

  it('fills month and year from the advisory', () => {
    expect(validTimeMs('06/0600', issued)).toBe(Date.UTC(2026, 8, 6, 6))
    expect(validTimeMs('11/0600', issued)).toBe(Date.UTC(2026, 8, 11, 6))
  })

  it('rolls into the next month when the day number wraps', () => {
    const lateSep = Date.UTC(2026, 8, 29, 21)
    expect(validTimeMs('02/1800', lateSep)).toBe(Date.UTC(2026, 9, 2, 18))
    const lateDec = Date.UTC(2026, 11, 30, 3)
    expect(validTimeMs('03/0000', lateDec)).toBe(Date.UTC(2027, 0, 3, 0))
  })

  it('rejects other shapes', () => {
    expect(validTimeMs('2026-09-06', issued)).toBeNull()
  })
})

describe('motionText', () => {
  it('reads like an advisory', () => {
    expect(motionText(315, 8)).toBe('NW 8 kt')
    expect(motionText(null, 0)).toBe('stationary')
    expect(motionText(90, 12)).toBe('E 12 kt')
  })
})
