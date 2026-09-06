import { describe, expect, it } from 'vitest'
import { gfsRunLabel } from '@/core/data/gfsRun'

describe('gfsRunLabel', () => {
  it('names the cycle and forecast hour', () => {
    expect(gfsRunLabel({ run: '20260906 06z', fhour: 18, valid: '' })).toBe('GFS 06z +18 h')
  })
  it('calls f000 an analysis', () => {
    expect(gfsRunLabel({ run: '20260905 18z', fhour: 0, valid: '' })).toBe('GFS 18z analysis')
  })
  it('degrades to the model name with nothing loaded', () => {
    expect(gfsRunLabel(undefined)).toBe('GFS')
  })
})
