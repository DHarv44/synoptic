import { registerFeature } from '@/core/settings/registry'
import { ModelsPanel } from '@/features/models/ModelsPanel'

/** Multi-model forecast comparison at the probe point. */
registerFeature({
  id: 'models',
  title: 'Model comparison',
  description: 'GFS / ECMWF / ICON / GEM / UKMO spaghetti + GFS ensemble at the probe.',
  panels: [{ id: 'models', title: 'Models', component: ModelsPanel, group: 'place', order: 5 }],
  defaultEnabled: true,
  settings: [],
})
