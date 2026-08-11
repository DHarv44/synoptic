import { registerFeature } from '@/core/settings/registry'
import { HourlyPanel } from '@/features/forecast/HourlyPanel'
import { DailyPanel } from '@/features/forecast/DailyPanel'

/** Hourly and multi-day forecast for the probed point (Open-Meteo). */
registerFeature({
  id: 'forecast',
  title: 'Forecast',
  description: 'Hourly and multi-day outlook for the probed location (Open-Meteo).',
  panels: [
    { id: 'forecast-hourly', title: 'Next 24 hours', component: HourlyPanel, group: 'place', order: 1 },
    { id: 'forecast-daily', title: 'Outlook', component: DailyPanel, group: 'place', order: 2 },
  ],
  defaultEnabled: true,
  settings: [],
})
