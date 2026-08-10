import { registerFeature } from '@/core/settings/registry'

/**
 * Latitude/longitude grid on the globe. Layer component arrives with the
 * globe scene (S6); registered now as the registry's first real feature.
 */
registerFeature({
  id: 'graticule',
  title: 'Graticule',
  description: 'Latitude/longitude grid lines on the globe.',
  layer: true,
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
