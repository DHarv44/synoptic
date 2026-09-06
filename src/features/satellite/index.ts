import { IconSatellite } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { featureOption } from '@/core/settings/store'
import { SatelliteLayer } from '@/features/satellite/SatelliteLayer'
import { satelliteTimeMeta } from '@/features/satellite/service'

/** NASA GIBS satellite imagery: 10-min GOES-East/West + Himawari, daily VIIRS. */
registerFeature({
  id: 'satellite',
  title: 'Satellite',
  description:
    'NASA GIBS imagery, timeline-dated. GOES-East, GOES-West and Himawari bands update every 10 minutes (~1 h behind, ~1 month of archive); VIIRS is daily and global.',
  layer: true,
  layerGroup: 'analysis',
  layerIcon: IconSatellite,
  layerComponent: SatelliteLayer,
  sourceIds: ['gibs'],
  timeMeta: () => satelliteTimeMeta(featureOption<string>('satellite', 'product')),
  defaultEnabled: false,
  settings: [
    {
      kind: 'select',
      key: 'product',
      label: 'Product',
      // Label doubles as the one-line "what this band shows" (PLAN §3.4).
      // The long menu is deliberate — a workstation lists every satellite ×
      // band. Ordered by band, East → West → Himawari within each.
      options: [
        { value: 'geocolor', label: 'GeoColor — day true color, night IR (GOES-East, 10 min)' },
        { value: 'geocolor-west', label: 'GeoColor (GOES-West, 10 min)' },
        { value: 'goes-ir', label: 'Clean IR — cloud tops, works at night (GOES-East, 10 min)' },
        { value: 'ir-west', label: 'Clean IR (GOES-West, 10 min)' },
        { value: 'ir-himawari', label: 'Clean IR (Himawari — W Pacific/Asia, 10 min)' },
        { value: 'airmass', label: 'Air Mass — jet streams and dry slots (GOES-East, 10 min)' },
        { value: 'airmass-west', label: 'Air Mass (GOES-West, 10 min)' },
        { value: 'airmass-himawari', label: 'Air Mass (Himawari, 10 min)' },
        { value: 'goes-vis', label: 'Red Visible — sharpest daytime detail (GOES-East, 10 min)' },
        { value: 'vis-west', label: 'Red Visible (GOES-West, 10 min)' },
        { value: 'vis-himawari', label: 'Red Visible (Himawari, 10 min)' },
        { value: 'truecolor', label: 'True color — global, daily (VIIRS)' },
        { value: 'ir', label: 'IR brightness temp — global, daily (VIIRS I5)' },
      ],
      defaultValue: 'geocolor',
    },
    {
      kind: 'number',
      key: 'opacity',
      label: 'Opacity %',
      min: 10,
      max: 100,
      step: 5,
      defaultValue: 90,
    },
  ],
})
