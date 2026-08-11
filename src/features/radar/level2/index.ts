import { IconBox, IconRadar } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { Level2Layer } from '@/features/radar/level2/Level2Layer'
import { RadarWorkbench } from '@/features/radar/level2/RadarWorkbench'
import { RadarReadouts } from '@/features/radar/level2/RadarReadouts'

/**
 * Single-site NEXRAD Level 2: streaming super-res reflectivity from the
 * real-time chunks bucket. Auto-selects the nearest site when zoomed in.
 */
registerFeature({
  id: 'level2',
  title: 'Radar · Level 2',
  description: 'Single-site super-res reflectivity, streamed radial-by-radial (zoom in).',
  layer: true,
  layerGroup: 'radar',
  layerIcon: IconRadar,
  layerComponent: Level2Layer,
  sourceIds: ['nexrad-l2'],
  tools: [{ id: 'radar-workbench', title: 'Radar views', icon: IconBox, component: RadarWorkbench }],
  panels: [
    { id: 'radar-readouts', title: 'Level 2', component: RadarReadouts, group: 'radar', order: 0 },
  ],
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
