import { registerFeature } from '@/core/settings/registry'
import { ConditionsPanel } from '@/features/conditions/ConditionsPanel'

/** Current conditions at the probe point (Open-Meteo). */
registerFeature({
  id: 'conditions',
  title: 'Conditions',
  description: 'Current conditions at the probed location (Open-Meteo).',
  panels: [{ id: 'conditions', title: 'Now', component: ConditionsPanel, group: 'place', order: 0 }],
  defaultEnabled: true,
  settings: [],
})
