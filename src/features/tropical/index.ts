import { IconStorm } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { registerMapPopup } from '@/map/popups/registry'
import { TropicalLayer } from '@/features/tropical/TropicalLayer'
import { TropicalLegend } from '@/features/tropical/TropicalLegend'
import { TropicalPanel } from '@/features/tropical/TropicalPanel'
import { TropicalSummary } from '@/features/tropical/TropicalSummary'
import { ConePopup, StormPopup } from '@/features/tropical/StormPopup'

/** Tropical cyclones: NHC's active storms with track, cone and forecast points. */
registerFeature({
  id: 'tropical',
  title: 'Tropical cyclones',
  description:
    'Active tropical cyclones from the National Hurricane Center — current position and intensity, past track, forecast track with category at each forecast hour, and the forecast cone (centre uncertainty, not storm size).',
  layer: true,
  layerGroup: 'reference',
  layerIcon: IconStorm,
  layerComponent: TropicalLayer,
  legendComponent: TropicalLegend,
  sourceIds: ['nhc', 'nhc-gis'],
  panels: [
    {
      id: 'tropical',
      title: 'Tropical',
      component: TropicalPanel,
      group: 'nearby',
      order: 4,
      summary: TropicalSummary,
    },
  ],
  defaultEnabled: true,
  settings: [
    { kind: 'boolean', key: 'cone', label: 'Forecast cone', defaultValue: true },
    { kind: 'boolean', key: 'pastTrack', label: 'Past track', defaultValue: true },
  ],
})

registerMapPopup({ layerIds: ['tropical-current', 'tropical-points'], component: StormPopup })
registerMapPopup({ layerIds: ['tropical-cone-fill'], component: ConePopup })
