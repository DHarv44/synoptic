import { registerFeature } from '@/core/settings/registry'
import { AlertsLayer } from '@/features/alerts/AlertsLayer'
import { AlertsPanel } from '@/features/alerts/AlertsPanel'

/** NWS active alerts: warning polygons + severity-sorted list. */
registerFeature({
  id: 'alerts',
  title: 'Alerts',
  description: 'NWS active alerts: warning polygons on the globe + list panel (US).',
  layer: true,
  layerGroup: 'reference',
  layerComponent: AlertsLayer,
  sourceIds: ['nws-alerts'],
  panels: [{ id: 'alerts', title: 'Alerts', component: AlertsPanel, group: 'nearby', order: 0 }],
  defaultEnabled: true,
  settings: [],
})
