import { registerFeature } from '@/core/settings/registry'
import { MeteogramPanel } from '@/features/meteogram/MeteogramPanel'

/** 7-day meteogram for the probe point. */
registerFeature({
  id: 'meteogram',
  title: 'Meteogram',
  description: '7-day hourly meteogram for the probed location.',
  panels: [
    { id: 'meteogram', title: 'Meteogram', component: MeteogramPanel, group: 'place', order: 3 },
  ],
  defaultEnabled: true,
  settings: [],
})
