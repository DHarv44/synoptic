import { IconAlertTriangle } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { SpcLayer } from '@/features/spc/SpcLayer'
import { SpcPanel } from '@/features/spc/SpcPanel'
import { SpcSummary } from '@/features/spc/SpcSummary'

/** SPC: convective outlooks, watch boxes, mesoscale discussions. */
registerFeature({
  id: 'spc',
  title: 'SPC outlooks',
  description:
    'Storm Prediction Center convective outlooks (Day 1–3), watch boxes and mesoscale discussions, in SPC’s own colours.',
  layer: true,
  layerGroup: 'analysis',
  layerIcon: IconAlertTriangle,
  layerComponent: SpcLayer,
  sourceIds: ['spc'],
  defaultEnabled: false,
  panels: [
    {
      id: 'spc-activity',
      title: 'SPC activity',
      component: SpcPanel,
      summary: SpcSummary,
      group: 'nearby',
      order: 3,
    },
  ],
  settings: [
    {
      kind: 'select',
      key: 'day',
      label: 'Outlook day',
      options: [
        { value: '1', label: 'Day 1' },
        { value: '2', label: 'Day 2' },
        { value: '3', label: 'Day 3' },
      ],
      defaultValue: '1',
    },
    { kind: 'boolean', key: 'watches', label: 'Watch boxes', defaultValue: true },
    { kind: 'boolean', key: 'mcds', label: 'Mesoscale discussions', defaultValue: true },
  ],
})
