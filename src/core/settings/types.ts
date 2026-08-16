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

/** Top-level dock sections: probe-driven, viewport-driven, radar tools. */
export type PanelGroup = 'place' | 'nearby' | 'radar'

export interface PanelContribution {
  id: string
  title: string
  component: ComponentType
  group: PanelGroup
  /** Sort order within the group (lower first). */
  order?: number
  /**
   * One-line status shown on the section header while collapsed — since
   * sections start collapsed, this is what makes the stack scannable.
   */
  summary?: ComponentType
}

/** Grouping for the map's layer toggle popover. */
export type LayerGroup = 'radar' | 'observations' | 'analysis' | 'reference'

/**
 * A tool view: a workbench with its own camera/navigation (3D echo,
 * cross-section) rather than a readout. Tools live in the left panel;
 * readouts live in the right dock.
 */
export interface ToolContribution {
  id: string
  title: string
  icon: ComponentType<{ size?: number | string; stroke?: number }>
  component: ComponentType
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
  /** Contributes a togglable map layer (entry in the map layer control). */
  layer?: boolean
  /** Which group the layer toggle appears under. */
  layerGroup?: LayerGroup
  /** Icon for the map layer toggle (a Tabler icon component). */
  layerIcon?: ComponentType<{ size?: number | string; stroke?: number }>
  /** R3F component rendered inside the globe scene while the feature is enabled. */
  layerComponent?: ComponentType
  /**
   * Renders nothing, but stays mounted for as long as the feature is
   * enabled — for watchers whose whole job is to run when nobody is
   * looking at them. Independent of the map, unlike `layerComponent`.
   */
  backgroundComponent?: ComponentType
  /** Analysis dock panels this feature contributes. */
  panels?: PanelContribution[]
  /**
   * Live status shown on the rail tab holding this feature's panels — the
   * feature owns the condition, `RailIndicator` owns the look. Keeps the
   * shell from having to read feature stores.
   */
  dockIndicator?: ComponentType
  /** Left-panel tool views this feature contributes. */
  tools?: ToolContribution[]
  settings: SettingField[]
  /** Health-strip source ids this feature consumes (drives rail badges). */
  sourceIds?: string[]
  /**
   * Publication lag of this layer's animating imagery under its CURRENT
   * settings, or null when they make it non-animating (daily products).
   * Drives SYNC loop mode: the loop window is held back by the slowest
   * enabled layer so every participant has real frames across it.
   */
  timeMeta?: () => { lagMs: number } | null
  defaultEnabled?: boolean
  /** Core capabilities (e.g. units) that expose settings but can't be disabled. */
  alwaysOn?: boolean
}
