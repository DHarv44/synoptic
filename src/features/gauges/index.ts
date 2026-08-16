import { IconRipple } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { registerMapPopup } from '@/map/popups/registry'
import { GaugePopup } from '@/features/gauges/GaugePopup'
import { GaugesLayer } from '@/features/gauges/GaugesLayer'

/** River gauges from the NWS National Water Prediction Service. */
registerFeature({
  id: 'gauges',
  title: 'River gauges',
  description:
    'Stream gauges coloured by flood category (action through major), from the NWS National Water Prediction Service.',
  layer: true,
  layerGroup: 'observations',
  layerIcon: IconRipple,
  layerComponent: GaugesLayer,
  sourceIds: ['nwps'],
  defaultEnabled: false,
  settings: [
    {
      kind: 'boolean',
      key: 'floodingOnly',
      label: 'Only gauges at or above action stage',
      defaultValue: false,
    },
  ],
})

registerMapPopup({ layerIds: ['gauges'], component: GaugePopup })
