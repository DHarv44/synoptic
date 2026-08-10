import type { ComponentType } from 'react'

export type SettingValue = boolean | number | string

export type SettingField =
  | { kind: 'boolean'; key: string; label: string; defaultValue: boolean }
  | {
      kind: 'number'
      key: string
      label: string
      min: number
      max: number
      step?: number
      defaultValue: number
    }
  | {
      kind: 'select'
      key: string
      label: string
      options: ReadonlyArray<{ value: string; label: string }>
      defaultValue: string
    }

export interface PanelContribution {
  id: string
  title: string
}

/**
 * Everything a feature tells the shell about itself. The settings screen,
 * layer rail, and analysis dock are generated from these — a feature that
 * isn't registered doesn't exist.
 */
export interface FeatureManifest {
  id: string
  title: string
  description: string
  /** Contributes a togglable viewport layer (entry in the layer rail). */
  layer?: boolean
  /** R3F component rendered inside the globe scene while the feature is enabled. */
  layerComponent?: ComponentType
  /** Analysis dock panels this feature contributes. */
  panels?: PanelContribution[]
  settings: SettingField[]
  defaultEnabled?: boolean
}
