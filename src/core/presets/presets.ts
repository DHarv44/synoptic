import { featureEnabled, featureOption, useSettings } from '@/core/settings/store'
import { getFeature } from '@/core/settings/registry'
import type { SettingValue } from '@/core/settings/types'

/**
 * The features a preset governs — the map scene. Identity settings (units,
 * notifications, interface) are the user's own and no preset touches them.
 * `alerts` is deliberately absent: warnings never turn off with a scene
 * change, whatever the preset says.
 */
export const SCENE_FEATURES = [
  'radar',
  'level2',
  'satellite',
  'wind',
  'fields',
  'fronts',
  'graticule',
  'aviation',
  'spc',
  'cells',
  'metar',
  'lightning',
  'gauges',
  'buoys',
] as const

export type SceneFeature = (typeof SCENE_FEATURES)[number]

/** `true` enables with manifest defaults; an object also overrides options. */
export type SceneSpec = Partial<Record<SceneFeature, true | Record<string, SettingValue>>>

export interface Preset {
  id: string
  label: string
  description: string
  /** null restores every scene feature to its manifest defaults. */
  scene: SceneSpec | null
}

/**
 * Built-ins are cut by task, the way AWIPS procedures are — a forecaster
 * flips between jobs, not between "more" and "less".
 */
export const BUILT_IN_PRESETS: Preset[] = [
  {
    id: 'default',
    label: 'Default',
    description: 'Factory layers and settings.',
    scene: null,
  },
  {
    id: 'severe',
    label: 'Severe ops',
    description: 'Radar, storm cells, watches, lightning.',
    scene: {
      radar: { source: 'mosaic' },
      level2: true,
      cells: true,
      lightning: true,
      spc: true,
    },
  },
  {
    id: 'synoptic',
    label: 'Synoptic analysis',
    description: 'Air-mass satellite, isobars, fronts, steering flow.',
    scene: {
      satellite: { product: 'airmass' },
      fields: { field: 'mslp' },
      fronts: true,
      graticule: true,
      wind: { level: '500' },
    },
  },
  {
    id: 'chart',
    label: 'Surface chart',
    description: 'WPC-style: isobars, fronts with pips, pressure centres, station plots.',
    scene: {
      fields: { field: 'mslp' },
      fronts: true,
      metar: true,
      graticule: true,
    },
  },
  {
    id: 'aviation',
    label: 'Aviation',
    description: 'METARs, SIGMETs, PIREPs over satellite and radar.',
    scene: {
      radar: { source: 'mosaic' },
      metar: true,
      aviation: true,
      satellite: { product: 'geocolor' },
    },
  },
  {
    id: 'marine',
    label: 'Marine',
    description: 'Buoys, surface wind, worldwide radar.',
    scene: {
      radar: { source: 'global' },
      buoys: true,
      wind: { level: '10m' },
      satellite: { product: 'geocolor' },
    },
  },
  {
    id: 'hydro',
    label: 'Hydro',
    description: 'River gauges and rainfall radar.',
    scene: {
      radar: { source: 'mosaic' },
      gauges: true,
    },
  },
]

export function getPreset(id: string): Preset | undefined {
  return BUILT_IN_PRESETS.find((p) => p.id === id)
}

/**
 * Full-replace scene semantics: every scene feature is reset to manifest
 * defaults first, so a preset always lands the same regardless of what was
 * tweaked before it. Features the preset names are then enabled with their
 * overrides; the rest stay at defaults but disabled.
 */
export function applyPreset(preset: Preset): void {
  const s = useSettings.getState()
  for (const id of SCENE_FEATURES) {
    s.resetFeature(id)
    if (preset.scene === null) continue
    const spec = preset.scene[id]
    s.setEnabled(id, spec !== undefined)
    if (spec !== undefined && spec !== true) {
      for (const [key, value] of Object.entries(spec)) s.setOption(id, key, value)
    }
  }
}

/**
 * Does the CURRENT settings state land exactly where applying this preset
 * would? Compared against effective values (manifest defaults filled in),
 * so the answer survives reloads and doesn't care how the state got there.
 */
export function sceneMatches(preset: Preset): boolean {
  for (const id of SCENE_FEATURES) {
    const spec = preset.scene === null ? undefined : preset.scene[id]
    const manifest = getFeature(id)
    const wantEnabled =
      preset.scene === null ? (manifest?.defaultEnabled ?? true) : spec !== undefined
    if (featureEnabled(id) !== wantEnabled) return false
    for (const field of manifest?.settings ?? []) {
      const override =
        spec !== undefined && spec !== true ? spec[field.key] : undefined
      if (featureOption(id, field.key) !== (override ?? field.defaultValue)) return false
    }
  }
  return true
}
