import { registerFeature } from '@/core/settings/registry'
import { GraticuleLayer } from '@/features/graticule/GraticuleLayer'

/** Latitude/longitude grid on the globe. */
registerFeature({
  id: 'graticule',
  title: 'Graticule',
  description: 'Latitude/longitude grid lines on the globe.',
  layer: true,
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
  ],
})
