import { IconWind } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { WindLayer } from '@/features/wind/WindLayer'
import { WindLegend } from '@/features/wind/WindLegend'

/** GPU particle wind field (GFS via NOMADS), selectable pressure level. */
registerFeature({
  id: 'wind',
  title: 'Wind',
  description: 'GFS wind as GPU particle flow — surface up to the jet stream.',
  layer: true,
  layerGroup: 'analysis',
  layerIcon: IconWind,
  layerComponent: WindLayer,
  legendComponent: WindLegend,
  sourceIds: ['gfs-wind'],
  // On by default now the decode is fixed (the negative-reference bug that
  // shifted every value by tens of m/s is corrected in the server's
  // grib2RefValue path). Verified against Open-Meteo GFS point values to
  // <0.2 m/s across the old artefact region and a strong jet.
  defaultEnabled: true,
  settings: [
    {
      kind: 'boolean',
      key: 'field',
      label: 'Speed field wash',
      defaultValue: true,
    },
    {
      kind: 'number',
      key: 'fieldOpacity',
      label: 'Field opacity %',
      min: 10,
      max: 90,
      step: 5,
      // Wind is on by default; at 30 the wash reads as context under radar
      // and satellite rather than as the picture.
      defaultValue: 30,
    },
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
      // Streaks, like the wash, are context in the default scene.
      defaultValue: 30,
    },
  ],
})
