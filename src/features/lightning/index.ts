import { registerFeature } from '@/core/settings/registry'
import { LightningLayer } from '@/features/lightning/LightningLayer'

/** Live lightning strikes from the Blitzortung community network. */
registerFeature({
  id: 'lightning',
  title: 'Lightning',
  description: 'Live strikes from the Blitzortung community network (seconds latency).',
  layer: true,
  layerComponent: LightningLayer,
  sourceIds: ['blitzortung'],
  defaultEnabled: true,
  settings: [],
})
