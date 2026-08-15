import { IconSatellite } from '@tabler/icons-react'
import { registerFeature } from '@/core/settings/registry'
import { SatelliteLayer } from '@/features/satellite/SatelliteLayer'

/** NASA GIBS satellite imagery: daily VIIRS global, 10-min GOES-East. */
registerFeature({
  id: 'satellite',
  title: 'Satellite',
  description:
    'NASA GIBS imagery, timeline-dated. GOES-East bands update every 10 minutes (~1 h behind); VIIRS is daily and global.',
  layer: true,
  layerGroup: 'analysis',
  layerIcon: IconSatellite,
  layerComponent: SatelliteLayer,
  sourceIds: ['gibs'],
  defaultEnabled: false,
  settings: [
    {
      kind: 'select',
      key: 'product',
      label: 'Product',
      // Label doubles as the one-line "what this band shows" (PLAN §3.4).
      options: [
        { value: 'geocolor', label: 'GeoColor — day true color, night IR (GOES, 10 min)' },
        { value: 'goes-ir', label: 'Clean IR — cloud tops, works at night (GOES, 10 min)' },
        { value: 'airmass', label: 'Air Mass — jet streams and dry slots (GOES, 10 min)' },
        { value: 'goes-vis', label: 'Red Visible — sharpest daytime detail (GOES, 10 min)' },
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
