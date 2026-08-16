import { describe, expect, it } from 'vitest'
import { BUILT_IN_PRESETS, SCENE_FEATURES, applyPreset, getPreset } from '@/core/presets/presets'
import { useSettings } from '@/core/settings/store'

describe('built-in presets', () => {
  it('have unique ids and only reference scene features', () => {
    const ids = BUILT_IN_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    const scene = new Set<string>(SCENE_FEATURES)
    for (const p of BUILT_IN_PRESETS) {
      for (const key of Object.keys(p.scene ?? {})) expect(scene.has(key)).toBe(true)
    }
  })

  it('never touch alerts — warnings cannot be preset off', () => {
    expect(SCENE_FEATURES).not.toContain('alerts')
  })
})

describe('applyPreset', () => {
  it('is full-replace: unnamed scene features end up disabled, named ones enabled', () => {
    const severe = getPreset('severe')
    if (!severe) throw new Error('severe preset missing')
    applyPreset(severe)
    const f = useSettings.getState().features
    expect(f['cells']?.enabled).toBe(true)
    expect(f['radar']?.enabled).toBe(true)
    expect(f['buoys']?.enabled).toBe(false)
    expect(f['radar']?.options['source']).toBe('mosaic')
  })

  it('lands identically regardless of prior tweaks', () => {
    const marine = getPreset('marine')
    if (!marine) throw new Error('marine preset missing')
    useSettings.getState().setOption('radar', 'source', 'mosaic')
    useSettings.getState().setEnabled('lightning', true)
    applyPreset(marine)
    const f = useSettings.getState().features
    expect(f['radar']?.options['source']).toBe('global')
    expect(f['lightning']?.enabled).toBe(false)
  })
})
