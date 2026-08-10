import { registerFeature } from '@/core/settings/registry'
import { RadarLayer } from '@/features/radar/RadarLayer'

/** Global composite precipitation radar (RainViewer tiles, 10-min cadence). */
registerFeature({
  id: 'radar',
  title: 'Radar',
  description: 'Global composite precipitation radar (RainViewer, 10-min updates).',
  layer: true,
  layerComponent: RadarLayer,
  defaultEnabled: true,
  settings: [
    {
      kind: 'select',
      key: 'scheme',
      label: 'Color table',
      options: [
        { value: '6', label: 'NEXRAD Level 3' },
        { value: '2', label: 'Universal Blue' },
        { value: '4', label: 'The Weather Channel' },
        { value: '0', label: 'Black & White (CVD-safe)' },
      ],
      defaultValue: '6',
    },
    { kind: 'boolean', key: 'smooth', label: 'Smoothing', defaultValue: false },
    {
      kind: 'number',
      key: 'opacity',
      label: 'Opacity %',
      min: 10,
      max: 100,
      step: 5,
      defaultValue: 75,
    },
  ],
})
