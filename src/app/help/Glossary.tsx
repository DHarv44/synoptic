import { Fragment } from 'react'
import { Stack, Text } from '@mantine/core'

interface Term {
  term: string
  body: string
}

const RADAR: Term[] = [
  {
    term: 'Reflectivity (dBZ)',
    body: 'How strongly a volume of air scatters the beam back. Higher means bigger or denser targets — roughly, heavier precipitation. Above about 50 dBZ usually means hail is involved rather than simply harder rain.',
  },
  {
    term: 'Velocity, and why it folds',
    body: 'The radar measures motion along the beam only: toward it or away from it. Beyond a certain speed it cannot tell fast-outbound from fast-inbound and the value wraps around, which paints an abrupt red/green boundary in the middle of otherwise smooth flow. Dealiasing unwraps it; the RAW toggle shows what actually arrived.',
  },
  {
    term: 'Storm-relative velocity',
    body: 'The storm’s own motion subtracted, so you see the air circulating within it rather than the whole system travelling. Rotation that was hidden by translation stands out.',
  },
  {
    term: 'Elevation cuts and VCP',
    body: 'The dish sweeps a full circle at one angle, then tilts up and repeats. A volume coverage pattern is the recipe for that stack of angles; a severe-weather pattern completes in about 4 minutes, a clear-air one takes closer to 10.',
  },
  {
    term: 'Beam height, and the gaps between tilts',
    body: 'The beam climbs with range — both because it is aimed upward and because the atmosphere bends it less than the earth curves away. At 100 km even a 0.5° cut is roughly 1.5 km up. The empty space between cuts in the 3D view is air the radar never sampled, not air without echo.',
  },
  {
    term: 'TVS and mesocyclone',
    body: 'Automated flags on the storm-cell feed. A mesocyclone is a detected rotating updraft; a TVS is a tighter, stronger rotation signature. Both are algorithm output, not confirmation of anything on the ground.',
  },
]

const SOUNDING: Term[] = [
  {
    term: 'CAPE',
    body: 'Convective available potential energy: how much buoyancy a rising parcel would gain. Above ~1000 J/kg is notable, above ~2500 is large. It says how hard air can rise, not whether it will.',
  },
  {
    term: 'CIN, the cap',
    body: 'Energy that has to be overcome before a parcel can rise freely. A strong cap (below about −100 J/kg) suppresses storms — until something breaks it, at which point stored CAPE is released at once.',
  },
  {
    term: 'LCL, LFC, EL',
    body: 'Cloud base, the level above which a parcel rises on its own, and where it finally stops. A low LCL is one of the ingredients associated with tornadoes.',
  },
  {
    term: 'Bulk shear',
    body: 'How much the wind changes between two levels. Deep-layer (0–6 km) shear above ~35 kt is what lets an updraft rotate and survive rather than choke on its own rain.',
  },
  {
    term: 'SRH',
    body: 'Storm-relative helicity: the spin available to a storm moving with the flow. Above ~150 m²/s² over 0–1 km is significant.',
  },
  {
    term: 'Hodograph',
    body: 'The wind at every height plotted as a single curve rather than as barbs. Its length shows shear and its curvature shows turning — a long, curved trace is the shape that favours supercells.',
  },
  {
    term: 'PWAT',
    body: 'Precipitable water: the depth of water you would get by condensing the whole column. Above ~40 mm is a very moist atmosphere and a flash-flood concern.',
  },
]

function Section({ title, terms }: { title: string; terms: Term[] }) {
  return (
    <Stack gap={6}>
      <Text size="xs" fw={700} tt="uppercase" lts={0.8} c="dimmed">
        {title}
      </Text>
      {terms.map((t) => (
        <Fragment key={t.term}>
          <Text size="sm" fw={600}>
            {t.term}
          </Text>
          <Text size="sm" c="dimmed">
            {t.body}
          </Text>
        </Fragment>
      ))}
    </Stack>
  )
}

/** Plain-language notes on the numbers the pro panels report. */
export function Glossary() {
  return (
    <Stack gap="lg">
      <Text size="sm" c="dimmed">
        Enough to interpret what the panels show. Thresholds are rules of thumb, not
        rules.
      </Text>
      <Section title="Radar" terms={RADAR} />
      <Section title="Soundings" terms={SOUNDING} />
    </Stack>
  )
}
