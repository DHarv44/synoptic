import { registerFeature } from '@/core/settings/registry'
import { CellsLayer } from '@/features/cells/CellsLayer'
import { CellsPanel } from '@/features/cells/CellsPanel'

/** NEXRAD storm cell attributes: markers + sortable cell table. */
registerFeature({
  id: 'cells',
  title: 'Storm cells',
  description: 'NEXRAD storm attributes (TVS/meso/hail) as markers + cell table.',
  layer: true,
  layerComponent: CellsLayer,
  sourceIds: ['iem-attr'],
  panels: [{ id: 'cells', title: 'Cells', component: CellsPanel }],
  defaultEnabled: true,
  settings: [],
})
