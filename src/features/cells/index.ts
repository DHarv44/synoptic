import { IconAlertHexagon } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { registerMapPopup } from '@/map/popups/registry'
import { CellPopup } from '@/features/cells/CellPopup'
import { CellsLayer } from '@/features/cells/CellsLayer'
import { CellsPanel } from '@/features/cells/CellsPanel'
import { CellsSummary } from '@/features/cells/CellsSummary'

/** NEXRAD storm cell attributes: markers + sortable cell table. */
registerFeature({
  id: 'cells',
  title: 'Storm cells',
  description: 'NEXRAD storm attributes (TVS/meso/hail) as markers + cell table.',
  layer: true,
  layerGroup: 'observations',
  layerIcon: IconAlertHexagon,
  layerComponent: CellsLayer,
  sourceIds: ['iem-attr'],
  panels: [{ id: 'cells', title: 'Cells', component: CellsPanel, group: 'nearby', order: 1, summary: CellsSummary }],
  defaultEnabled: true,
  settings: [
    {
      kind: 'select',
      key: 'minSeverity',
      label: 'Show cells',
      options: [
        { value: '0', label: 'All tracked cells' },
        { value: '1', label: 'Hail or large cells' },
        { value: '2', label: 'Rotating (meso) and above' },
        { value: '3', label: 'Tornado signatures only' },
      ],
      defaultValue: '0',
    },
  ],
})

registerMapPopup({ layerIds: ['cells', 'cells-label'], component: CellPopup })
