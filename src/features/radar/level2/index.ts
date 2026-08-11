import { registerFeature } from '@/core/settings/registry'
import { Level2Layer } from '@/features/radar/level2/Level2Layer'
import { Volume3D } from '@/features/radar/level2/Volume3D'

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
  panels: [{ id: 'volume3d', title: '3D', component: Volume3D }],
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
