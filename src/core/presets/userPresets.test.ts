import { beforeEach, describe, expect, it } from 'vitest'
import { registerFeature } from '@/core/settings/registry'
import { useSettings } from '@/core/settings/store'
import { SCENE_FEATURES, applyPreset, sceneMatches } from '@/core/presets/presets'
import { allPresets, captureScene, useUserPresets } from '@/core/presets/userPresets'

// One registered scene feature with a setting, so option capture has
// something to capture; the rest of SCENE_FEATURES stay unregistered
// (no settings → enabled means plain `true`).
registerFeature({
  id: 'graticule',
  title: 'Graticule',
  description: 'test',
  settings: [{ kind: 'number', key: 'density', label: 'Density', min: 1, max: 50, step: 1, defaultValue: 10 }],
})

beforeEach(() => {
  useSettings.getState().resetAll()
  for (const id of SCENE_FEATURES) useSettings.getState().setEnabled(id, false)
  useUserPresets.setState({ presets: [] })
})

describe('captureScene', () => {
  it('records enabled features only, with just the options that differ from defaults', () => {
    const s = useSettings.getState()
    s.setEnabled('graticule', true)
    s.setOption('graticule', 'density', 20)
    s.setEnabled('radar', true)
    expect(captureScene()).toEqual({ graticule: { density: 20 }, radar: true })
  })

  it('writes plain `true` when every option is at its default', () => {
    useSettings.getState().setEnabled('graticule', true)
    expect(captureScene()).toEqual({ graticule: true })
  })
})

describe('user presets', () => {
  it('saves, lists after the built-ins, and matches its own scene', () => {
    useSettings.getState().setEnabled('cells', true)
    const saved = useUserPresets.getState().save('  Storm watch ')
    expect(saved.label).toBe('Storm watch')
    expect(saved.id.startsWith('user-')).toBe(true)
    expect(allPresets().at(-1)?.id).toBe(saved.id)
    applyPreset(saved)
    expect(sceneMatches(saved)).toBe(true)
  })

  it('removes by id', () => {
    const a = useUserPresets.getState().save('A')
    useUserPresets.getState().save('B')
    useUserPresets.getState().remove(a.id)
    expect(useUserPresets.getState().presets.map((p) => p.label)).toEqual(['B'])
  })
})
