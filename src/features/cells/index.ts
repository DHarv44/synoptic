import { IconAlertHexagon } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
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
  settings: [],
})
