import { IconTemperature } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { registerMapPopup } from '@/map/popups/registry'
import { MetarLayer } from '@/features/metar/MetarLayer'
import { MetarPopup } from '@/features/metar/MetarPopup'

/** Surface observations as WMO station-model plots (METAR). */
registerFeature({
  id: 'metar',
  title: 'Surface obs',
  description: 'METAR station plots (temp, dewpoint, wind barb), thinned to the chosen density.',
  layer: true,
  layerGroup: 'observations',
  layerIcon: IconTemperature,
  layerComponent: MetarLayer,
  sourceIds: ['metar'],
  defaultEnabled: true,
  settings: [
    {
      kind: 'select',
      key: 'density',
      label: 'Station density',
      options: [
        { value: 'sparse', label: 'Sparse' },
        { value: 'normal', label: 'Normal' },
        { value: 'dense', label: 'Dense' },
      ],
      defaultValue: 'normal',
    },
  ],
})

registerMapPopup({ layerIds: ['metar'], component: MetarPopup })
