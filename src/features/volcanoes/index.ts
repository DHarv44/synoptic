import { IconVolcano } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { registerMapPopup } from '@/map/popups/registry'
import { VolcanoesLayer } from '@/features/volcanoes/VolcanoesLayer'
import { VolcanoesPanel } from '@/features/volcanoes/VolcanoesPanel'
import { VolcanoesSummary } from '@/features/volcanoes/VolcanoesSummary'
import { VolcanoPopup } from '@/features/volcanoes/VolcanoPopup'

/** Volcano tracking: GVP database, USGS alerts, VAAC ash advisories. */
registerFeature({
  id: 'volcanoes',
  title: 'Volcanoes',
  description:
    'Erupting and elevated volcanoes with VAAC ash-cloud advisories — observed and forecast ash polygons, the product aviation actually flies by.',
  layer: true,
  layerGroup: 'reference',
  layerIcon: IconVolcano,
  layerComponent: VolcanoesLayer,
  sourceIds: ['gvp', 'usgs-volcano', 'vaac'],
  panels: [
    {
      id: 'volcanoes',
      title: 'Volcanoes',
      component: VolcanoesPanel,
      group: 'nearby',
      order: 3,
      summary: VolcanoesSummary,
    },
  ],
  defaultEnabled: true,
  settings: [
    {
      kind: 'boolean',
      key: 'ash',
      label: 'Ash clouds (VAAC advisories)',
      defaultValue: true,
    },
    {
      kind: 'boolean',
      key: 'ashForecast',
      label: 'Forecast ash positions (+6/+12/+18 h)',
      defaultValue: true,
    },
    {
      kind: 'boolean',
      key: 'showAll',
      label: 'Show all Holocene volcanoes',
      defaultValue: false,
    },
  ],
})

registerMapPopup({ layerIds: ['volcanoes', 'volcano-labels'], component: VolcanoPopup })
