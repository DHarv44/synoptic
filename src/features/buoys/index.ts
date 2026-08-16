import { IconAnchor } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { BuoysLayer } from '@/features/buoys/BuoysLayer'

/** NDBC moored buoys and coastal stations, coloured by wave height. */
registerFeature({
  id: 'buoys',
  title: 'Buoys',
  description:
    'Moored buoys and coastal marine stations from NDBC, coloured by significant wave height.',
  layer: true,
  layerGroup: 'observations',
  layerIcon: IconAnchor,
  layerComponent: BuoysLayer,
  sourceIds: ['ndbc'],
  defaultEnabled: false,
  settings: [],
})
