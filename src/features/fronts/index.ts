import { IconTemperatureSnow } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { FrontsLayer } from '@/features/fronts/FrontsLayer'

/** WPC surface analysis: fronts and pressure centres from the coded bulletin. */
registerFeature({
  id: 'fronts',
  title: 'Surface fronts',
  description:
    "WPC's surface analysis — fronts and H/L pressure centres, reissued ~3-hourly. Pairs with MSLP isobars for a full surface chart.",
  layer: true,
  layerGroup: 'analysis',
  layerIcon: IconTemperatureSnow,
  layerComponent: FrontsLayer,
  sourceIds: ['wpc-fronts'],
  defaultEnabled: false,
  settings: [],
})
