import { IconStorm } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { registerMapPopup } from '@/map/popups/registry'
import { TropicalLayer } from '@/features/tropical/TropicalLayer'
import { TropicalLegend } from '@/features/tropical/TropicalLegend'
import { TropicalPanel } from '@/features/tropical/TropicalPanel'
import { TropicalSummary } from '@/features/tropical/TropicalSummary'
import {
  ConePopup,
  ModelPopup,
  RadiiPopup,
  StormPopup,
  WatchWarnPopup,
} from '@/features/tropical/StormPopup'

/** Tropical cyclones: NHC's active storms with track, cone and forecast points. */
registerFeature({
  id: 'tropical',
  title: 'Tropical cyclones',
  description:
    'Active tropical cyclones from the National Hurricane Center — current position and intensity, past track, forecast track with category at each forecast hour, the forecast cone (centre uncertainty, not storm size), and 34/50/64 kt wind radii that follow the clock.',
  layer: true,
  layerGroup: 'reference',
  layerIcon: IconStorm,
  layerComponent: TropicalLayer,
  legendComponent: TropicalLegend,
  sourceIds: ['nhc', 'nhc-gis', 'nhc-atcf'],
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
    {
      kind: 'number',
      key: 'opacity',
      label: 'Opacity %',
      min: 10,
      max: 100,
      step: 5,
      defaultValue: 100,
    },
    { kind: 'boolean', key: 'cone', label: 'Forecast cone', defaultValue: true },
    { kind: 'boolean', key: 'windRadii', label: 'Wind radii (34/50/64 kt, follow the clock)', defaultValue: true },
    { kind: 'boolean', key: 'arrival', label: 'TS-wind arrival-time lines', defaultValue: true },
    { kind: 'boolean', key: 'watchWarn', label: 'Coastal watches and warnings', defaultValue: true },
    { kind: 'boolean', key: 'pastTrack', label: 'Past track', defaultValue: true },
    {
      kind: 'boolean',
      key: 'models',
      label: 'Model tracks (spaghetti — spread is not probability)',
      defaultValue: false,
    },
  ],
})

registerMapPopup({ layerIds: ['tropical-current', 'tropical-points'], component: StormPopup })
registerMapPopup({ layerIds: ['tropical-models'], component: ModelPopup })
registerMapPopup({ layerIds: ['tropical-ww-warning', 'tropical-ww-watch'], component: WatchWarnPopup })
registerMapPopup({ layerIds: ['tropical-radii-fill'], component: RadiiPopup })
registerMapPopup({ layerIds: ['tropical-cone-fill'], component: ConePopup })
