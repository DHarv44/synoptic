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
        { value: 'metric', label: 'Metric (°C, km/h, mm)' },
        { value: 'imperial', label: 'Imperial (°F, mph, in)' },
      ],
      defaultValue: 'metric',
    },
  ],
})
