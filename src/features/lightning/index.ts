import { IconBolt } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { LightningLayer } from '@/features/lightning/LightningLayer'

/** Live lightning strikes from the Blitzortung community network. */
registerFeature({
  id: 'lightning',
  title: 'Lightning',
  description: 'Live strikes from the Blitzortung community network (seconds latency).',
  layer: true,
  layerGroup: 'observations',
  layerIcon: IconBolt,
  layerComponent: LightningLayer,
  sourceIds: ['blitzortung'],
  defaultEnabled: true,
  settings: [
    {
      kind: 'number',
      key: 'fadeMinutes',
      label: 'Keep strikes for (minutes)',
      min: 2,
      max: 30,
      step: 1,
      defaultValue: 10,
    },
  ],
})
