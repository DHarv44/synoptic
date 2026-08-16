import { IconTemperatureSnow } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { FrontsLayer } from '@/features/fronts/FrontsLayer'

/** WPC surface analysis fronts from the coded bulletin. */
registerFeature({
  id: 'fronts',
  title: 'Surface fronts',
  description:
    "WPC's analysed fronts and troughs, reissued ~3-hourly. Pairs with MSLP isobars (which mark their own H/L) for a full surface chart.",
  layer: true,
  layerGroup: 'analysis',
  layerIcon: IconTemperatureSnow,
  layerComponent: FrontsLayer,
  sourceIds: ['wpc-fronts'],
  defaultEnabled: false,
  settings: [
    {
      kind: 'boolean',
      key: 'troughs',
      label: 'Troughs (dashed orange)',
      defaultValue: true,
    },
  ],
})
