import { IconTemperature } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { registerMapPopup } from '@/map/popups/registry'
import { MetarLayer } from '@/features/metar/MetarLayer'
import { MetarPopup } from '@/features/metar/MetarPopup'

/** Surface observations as WMO station-model plots (METAR + IEM tiers). */
registerFeature({
  id: 'metar',
  title: 'Surface obs',
  description:
    'Station plots (temp, dewpoint, wind barb) thinned to the chosen density: airport METARs, plus road-weather stations across the US and WMO SYNOP land stations worldwide — the same carpet a surface chart is drawn over.',
  layer: true,
  layerGroup: 'observations',
  layerIcon: IconTemperature,
  layerComponent: MetarLayer,
  sourceIds: ['metar', 'iem-obs'],
  defaultEnabled: true,
  settings: [
    { kind: 'boolean', key: 'road', label: 'Road weather stations (RWIS, US)', defaultValue: true },
    { kind: 'boolean', key: 'synop', label: 'SYNOP land stations (WMO)', defaultValue: true },
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
