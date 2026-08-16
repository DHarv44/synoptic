import { List, Stack, Text } from '@mantine/core'

interface Step {
  title: string
  body: string
}

/**
 * The interactions that aren't visible from the interface. Everything here
 * is something a first-time user would otherwise have to guess at.
 */
const BASICS: Step[] = [
  {
    title: 'Click anything to ask about it',
    body: 'Clicking a station, buoy, gauge, cell, report or warning opens its card in place. Clicking bare map shows conditions there, with Interrogate — which points every Location panel (forecast, sounding, models) at that spot. Ctrl+K searches instead.',
  },
  {
    title: 'The right rail holds readouts',
    body: 'Location is about the point you clicked; Nearby is about what is in view; Radar is the single-site tools. Clicking the tab you are already on collapses the panel — sections report themselves in one line while closed.',
  },
  {
    title: 'The left panel holds views',
    body: 'The radar workbench draws the volume in 3D and cuts vertical cross-sections. Drag its right edge to resize.',
  },
  {
    title: 'One composite, plus single-site detail',
    body: 'The composite covers wide areas — the US NEXRAD mosaic by default, or a worldwide one from Settings. Zoom past z6 and single-site Level 2 streams raw volumes on top, adding tilts, velocity and the 3D view. Both share a colour table and display floor, so zooming in resolves detail rather than switching products.',
  },
  {
    title: 'Drawing a cross-section',
    body: 'In the radar workbench, choose Cross-section and press Draw, then click the two ends on the map. Escape cancels; Redraw starts over.',
  },
  {
    title: 'The timeline moves everything at once',
    body: 'Radar frames, satellite imagery and the sounding all follow it. The hatched half is forecast. LIVE snaps back to now.',
  },
  {
    title: 'Warnings',
    body: 'Warning outlines are drawn above every other layer so they can never be lost behind radar. The alert list is filtered by your Settings — marine and coastal products are hidden by default, and the panel says how many it is hiding.',
  },
]

export function GettingStarted() {
  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        A weather workstation built entirely on free public data. Nothing here needs
        an account.
      </Text>
      <List spacing="sm" size="sm" listStyleType="none">
        {BASICS.map((s) => (
          <List.Item key={s.title}>
            <Text size="sm" fw={600}>
              {s.title}
            </Text>
            <Text size="sm" c="dimmed">
              {s.body}
            </Text>
          </List.Item>
        ))}
      </List>
    </Stack>
  )
}
