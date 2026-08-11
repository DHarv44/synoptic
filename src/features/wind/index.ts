import { IconWind } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { WindLayer } from '@/features/wind/WindLayer'

/** GPU particle wind field (GFS via NOMADS), selectable pressure level. */
registerFeature({
  id: 'wind',
  title: 'Wind',
  description: 'GFS wind as GPU particle flow — surface up to the jet stream.',
  layer: true,
  layerGroup: 'analysis',
  layerIcon: IconWind,
  layerComponent: WindLayer,
  sourceIds: ['gfs-wind'],
  // Off by default until the pinned wind-field corruption is fixed (SLICES.md).
  defaultEnabled: false,
  settings: [
    {
      kind: 'select',
      key: 'level',
      label: 'Level',
      options: [
        { value: '10m', label: 'Surface (10 m)' },
        { value: '850', label: '850 hPa (~1.5 km)' },
        { value: '700', label: '700 hPa (~3 km)' },
        { value: '500', label: '500 hPa (~5.5 km)' },
        { value: '250', label: '250 hPa (jet stream)' },
      ],
      defaultValue: '10m',
    },
    {
      kind: 'number',
      key: 'particles',
      label: 'Particles (thousands)',
      min: 10,
      max: 300,
      step: 10,
      defaultValue: 60,
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
