import { IconSatellite } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { SatelliteLayer } from '@/features/satellite/SatelliteLayer'

/** NASA GIBS satellite imagery (VIIRS daily; GOES sub-daily later). */
registerFeature({
  id: 'satellite',
  title: 'Satellite',
  description: 'NASA GIBS satellite imagery (daily VIIRS; timeline-dated).',
  layer: true,
  layerGroup: 'analysis',
  layerIcon: IconSatellite,
  layerComponent: SatelliteLayer,
  sourceIds: ['gibs'],
  defaultEnabled: false,
  settings: [
    {
      kind: 'select',
      key: 'product',
      label: 'Product',
      options: [
        { value: 'truecolor', label: 'True color (VIIRS)' },
        { value: 'ir', label: 'IR brightness temp (VIIRS I5)' },
      ],
      defaultValue: 'truecolor',
    },
    {
      kind: 'number',
      key: 'opacity',
      label: 'Opacity %',
      min: 10,
      max: 100,
      step: 5,
      defaultValue: 90,
    },
  ],
})
