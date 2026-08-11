import { registerFeature } from '@/core/settings/registry'
import { Level2Layer } from '@/features/radar/level2/Level2Layer'

/**
 * Single-site NEXRAD Level 2: streaming super-res reflectivity from the
 * real-time chunks bucket. Auto-selects the nearest site when zoomed in.
 */
registerFeature({
  id: 'level2',
  title: 'Radar · Level 2',
  description: 'Single-site super-res reflectivity, streamed radial-by-radial (zoom in).',
  layer: true,
  layerComponent: Level2Layer,
  sourceIds: ['nexrad-l2'],
  defaultEnabled: true,
  settings: [
    {
      kind: 'number',
      key: 'opacity',
      label: 'Opacity %',
      min: 10,
      max: 100,
      step: 5,
      defaultValue: 85,
    },
  ],
})
