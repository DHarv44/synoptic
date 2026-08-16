import { IconDroplets } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { PrecipLayer } from '@/features/precip/PrecipLayer'

/** MRMS precipitation accumulations: how much fell, not how hard it's falling. */
registerFeature({
  id: 'precip',
  title: 'Precip totals',
  description:
    'MRMS multi-sensor precipitation accumulations (1–72 h) — the flash-flood context under the radar, from the Iowa Environmental Mesonet.',
  layer: true,
  layerGroup: 'observations',
  layerIcon: IconDroplets,
  layerComponent: PrecipLayer,
  defaultEnabled: false,
  settings: [
    {
      kind: 'select',
      key: 'product',
      label: 'Accumulation window',
      options: [
        { value: 'p1h', label: '1 hour' },
        { value: 'p24h', label: '24 hours' },
        { value: 'p48h', label: '48 hours' },
        { value: 'p72h', label: '72 hours' },
      ],
      defaultValue: 'p24h',
    },
    {
      kind: 'number',
      key: 'opacity',
      label: 'Opacity %',
      min: 10,
      max: 100,
      step: 5,
      defaultValue: 80,
    },
  ],
})
