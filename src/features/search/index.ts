import { registerFeature } from '@/core/settings/registry'

/** Location search (Ctrl+K) — always-on shell capability. */
registerFeature({
  id: 'search',
  title: 'Search',
  description: 'Location search via Open-Meteo geocoding (Ctrl+K).',
  alwaysOn: true,
  settings: [],
})
