import { IconAlertTriangle } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { registerMapPopup } from '@/map/popups/registry'
import { AlertPopup } from '@/features/alerts/AlertPopup'
import { AlertsLayer } from '@/features/alerts/AlertsLayer'
import { AlertsPanel } from '@/features/alerts/AlertsPanel'
import { AlertsSummary } from '@/features/alerts/AlertsSummary'

/** NWS active alerts: warning polygons + severity-sorted list. */
registerFeature({
  id: 'alerts',
  title: 'Alerts',
  description: 'NWS active alerts: warning polygons on the globe + list panel (US).',
  layer: true,
  layerGroup: 'reference',
  layerIcon: IconAlertTriangle,
  layerComponent: AlertsLayer,
  sourceIds: ['nws-alerts'],
  panels: [{ id: 'alerts', title: 'Alerts', component: AlertsPanel, group: 'nearby', order: 0, summary: AlertsSummary }],
  defaultEnabled: true,
  settings: [
    {
      kind: 'select',
      key: 'minSeverity',
      label: 'Minimum severity',
      options: [
        { value: 'Extreme', label: 'Extreme only' },
        { value: 'Severe', label: 'Severe and above' },
        { value: 'Moderate', label: 'Moderate and above' },
        { value: 'Minor', label: 'Everything' },
      ],
      defaultValue: 'Minor',
    },
    // Tornado and thunderstorm warnings have no switch on purpose.
    { kind: 'boolean', key: 'showFlood', label: 'Flood', defaultValue: true },
    { kind: 'boolean', key: 'showTropical', label: 'Tropical', defaultValue: true },
    { kind: 'boolean', key: 'showWinter', label: 'Winter weather', defaultValue: true },
    { kind: 'boolean', key: 'showHeat', label: 'Heat', defaultValue: true },
    {
      kind: 'boolean',
      key: 'showMarine',
      label: 'Marine and coastal',
      defaultValue: false,
    },
    { kind: 'boolean', key: 'showOther', label: 'Other advisories', defaultValue: true },
  ],
})

registerMapPopup({ layerIds: ['alerts-fill'], component: AlertPopup })
