import { registerFeature } from '@/core/settings/registry'
import { SoundingPanel } from '@/features/sounding/SoundingPanel'

/** Vertical profile analysis: skew-T, hodograph, severe-weather indices. */
registerFeature({
  id: 'sounding',
  title: 'Sounding',
  description: 'Skew-T log-p, hodograph, and derived indices at the probed point.',
  panels: [{ id: 'sounding', title: 'Skew-T', component: SoundingPanel }],
  defaultEnabled: true,
  settings: [],
})
