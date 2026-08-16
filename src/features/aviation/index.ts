import { IconPlaneTilt } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { registerMapPopup } from '@/map/popups/registry'
import { AviationLayer } from '@/features/aviation/AviationLayer'
import { PirepPopup, SigmetPopup } from '@/features/aviation/AviationPopups'
import { AviationPanel } from '@/features/aviation/AviationPanel'
import { AviationSummary } from '@/features/aviation/AviationSummary'

/** Aviation hazards: SIGMET polygons and PIREP reports from AWC. */
registerFeature({
  id: 'aviation',
  title: 'Aviation hazards',
  description:
    'SIGMETs and pilot reports from aviationweather.gov. PIREPs are real aircraft reporting real turbulence and icing.',
  layer: true,
  layerGroup: 'observations',
  layerIcon: IconPlaneTilt,
  layerComponent: AviationLayer,
  sourceIds: ['awc-hazards'],
  defaultEnabled: false,
  panels: [
    {
      id: 'aviation-sigmets',
      title: 'SIGMETs',
      component: AviationPanel,
      summary: AviationSummary,
      group: 'nearby',
      order: 2,
    },
  ],
  settings: [
    { kind: 'boolean', key: 'sigmets', label: 'SIGMET areas', defaultValue: true },
    { kind: 'boolean', key: 'pireps', label: 'Pilot reports (PIREPs)', defaultValue: true },
  ],
})

registerMapPopup({ layerIds: ['pirep'], component: PirepPopup })
registerMapPopup({ layerIds: ['aviation-fill'], component: SigmetPopup })
