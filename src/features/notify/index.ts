import { registerFeature } from '@/core/settings/registry'
import { NotifyWatcher } from '@/features/notify/NotifyWatcher'
import { HomeAlertsPanel } from '@/features/notify/HomeAlertsPanel'

/** Desktop notifications for warnings covering the user's home location. */
registerFeature({
  id: 'notify',
  title: 'My alerts',
  description: 'Desktop notifications for warnings covering your saved location.',
  backgroundComponent: NotifyWatcher,
  panels: [
    { id: 'home-alerts', title: 'At my location', component: HomeAlertsPanel, group: 'nearby', order: -1 },
  ],
  defaultEnabled: true,
  settings: [
    {
      kind: 'select',
      key: 'minSeverity',
      label: 'Notify me about',
      options: [
        { value: 'Extreme', label: 'Extreme only' },
        { value: 'Severe', label: 'Severe and above' },
        { value: 'Moderate', label: 'Moderate and above' },
        { value: 'Minor', label: 'Everything' },
      ],
      defaultValue: 'Severe',
    },
  ],
})
