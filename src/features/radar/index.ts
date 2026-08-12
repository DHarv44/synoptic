import { IconRadar2 } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { RadarLayer } from '@/features/radar/RadarLayer'

/** Composite reflectivity: US NEXRAD mosaic, or a worldwide fallback. */
registerFeature({
  id: 'radar',
  title: 'Radar',
  description: 'Composite reflectivity — US NEXRAD mosaic, or worldwide coverage.',
  layer: true,
  layerGroup: 'radar',
  layerIcon: IconRadar2,
  layerComponent: RadarLayer,
  sourceIds: ['rainviewer', 'iem-nexrad'],
  defaultEnabled: true,
  settings: [
    {
      kind: 'select',
      key: 'source',
      label: 'Source',
      options: [
        { value: 'mosaic', label: 'US NEXRAD mosaic (high-res)' },
        { value: 'global', label: 'Worldwide composite' },
      ],
      defaultValue: 'mosaic',
    },
    {
      kind: 'number',
      key: 'floor',
      label: 'Display floor dBZ',
      min: -30,
      max: 40,
      step: 5,
      defaultValue: 15,
    },
    {
      kind: 'select',
      key: 'scheme',
      label: 'Color table (worldwide only)',
      options: [
        { value: '6', label: 'NEXRAD Level 3' },
        { value: '2', label: 'Universal Blue' },
        { value: '4', label: 'The Weather Channel' },
        { value: '0', label: 'Black & White (CVD-safe)' },
      ],
      defaultValue: '6',
    },
    {
      kind: 'boolean',
      key: 'smooth',
      label: 'Smoothing (worldwide only)',
      defaultValue: false,
    },
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
