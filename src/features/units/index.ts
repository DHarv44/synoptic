import { registerFeature } from '@/core/settings/registry'

/** Unit system — always-on core capability, exposed via generated settings. */
registerFeature({
  id: 'units',
  title: 'Units',
  description: 'Measurement units for all readouts.',
  alwaysOn: true,
  settings: [
    {
      kind: 'select',
      key: 'system',
      label: 'Unit system',
      options: [
        { value: 'metric', label: 'Metric (km/h, mm)' },
        { value: 'imperial', label: 'Imperial (mph, in)' },
      ],
      defaultValue: 'metric',
    },
    {
      kind: 'select',
      key: 'timeZone',
      label: 'Times shown in',
      options: [
        { value: 'local', label: 'Local time' },
        { value: 'utc', label: 'UTC / Zulu' },
      ],
      defaultValue: 'local',
    },
    {
      kind: 'select',
      key: 'temperature',
      label: 'Temperature',
      options: [
        { value: 'auto', label: 'Follow system' },
        { value: 'celsius', label: 'Celsius (°C)' },
        { value: 'fahrenheit', label: 'Fahrenheit (°F)' },
      ],
      defaultValue: 'auto',
    },
  ],
})
