import { registerFeature } from '@/core/settings/registry'
import { DEFAULT_CHROME_OPACITY } from '@/ui/mapChrome'

/** Appearance of the app chrome itself — always on, adjustable. */
registerFeature({
  id: 'interface',
  title: 'Interface',
  description: 'Appearance of the controls layered over the map.',
  alwaysOn: true,
  settings: [
    {
      kind: 'number',
      key: 'chromeOpacity',
      label: 'Map control opacity %',
      min: 30,
      max: 100,
      step: 2,
      defaultValue: DEFAULT_CHROME_OPACITY,
    },
  ],
})
