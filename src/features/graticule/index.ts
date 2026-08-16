import { IconGridDots } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { GraticuleLayer } from '@/features/graticule/GraticuleLayer'

/** Latitude/longitude grid on the globe. */
registerFeature({
  id: 'graticule',
  title: 'Graticule',
  description: 'Latitude/longitude grid lines on the map.',
  layer: true,
  layerGroup: 'reference',
  layerIcon: IconGridDots,
  layerComponent: GraticuleLayer,
  defaultEnabled: true,
  settings: [
    {
      kind: 'select',
      key: 'spacing',
      label: 'Grid spacing',
      options: [
        { value: '10', label: '10°' },
        { value: '15', label: '15°' },
        { value: '30', label: '30°' },
      ],
      defaultValue: '15',
    },
    {
      kind: 'number',
      key: 'opacity',
      label: 'Opacity %',
      min: 5,
      max: 80,
      step: 5,
      defaultValue: 20,
    },
  ],
})
