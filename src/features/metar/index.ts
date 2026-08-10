import { registerFeature } from '@/core/settings/registry'
import { MetarLayer } from '@/features/metar/MetarLayer'

/** Surface observations as WMO station-model plots (METAR). */
registerFeature({
  id: 'metar',
  title: 'Surface obs',
  description: 'METAR station plots (temp, dewpoint, wind barb) when zoomed in.',
  layer: true,
  layerComponent: MetarLayer,
  sourceIds: ['metar'],
  defaultEnabled: true,
  settings: [],
})
