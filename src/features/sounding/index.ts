import { registerFeature } from '@/core/settings/registry'
import { SoundingPanel } from '@/features/sounding/SoundingPanel'
import { SoundingSummary } from '@/features/sounding/SoundingSummary'

/** Vertical profile analysis: skew-T, hodograph, severe-weather indices. */
registerFeature({
  id: 'sounding',
  title: 'Sounding',
  description: 'Skew-T log-p, hodograph, and derived indices at the probed point.',
  panels: [{ id: 'sounding', title: 'Skew-T', component: SoundingPanel, group: 'place', order: 4, summary: SoundingSummary }],
  defaultEnabled: true,
  settings: [],
})
