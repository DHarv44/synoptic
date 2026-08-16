import { IconWaveSine } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { FieldsLayer } from '@/features/fields/FieldsLayer'

/** Contoured GFS analysis fields: isobars, heights, 850 temp, CAPE. */
registerFeature({
  id: 'fields',
  title: 'Model fields',
  description:
    'Contoured GFS analysis: MSLP isobars, 500 mb heights, 850 mb temperature, CAPE. Conventional chart intervals.',
  layer: true,
  layerGroup: 'analysis',
  layerIcon: IconWaveSine,
  layerComponent: FieldsLayer,
  sourceIds: ['gfs-grid'],
  defaultEnabled: false,
  settings: [
    {
      kind: 'select',
      key: 'field',
      label: 'Field',
      options: [
        { value: 'mslp', label: 'MSLP isobars' },
        { value: 'hgt500', label: '500 mb heights (6 dam)' },
        { value: 'temp850', label: '850 mb temperature (2 °C)' },
        { value: 'cape', label: 'CAPE (500 J/kg)' },
      ],
      defaultValue: 'mslp',
    },
    {
      kind: 'select',
      key: 'mslpInterval',
      label: 'Isobar interval',
      options: [
        { value: '2', label: '2 hPa — rings weak summer centres' },
        { value: '4', label: '4 hPa — classic spacing' },
      ],
      defaultValue: '2',
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
