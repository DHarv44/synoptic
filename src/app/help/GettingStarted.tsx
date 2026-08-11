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
    title: 'Click the map to interrogate a point',
    body: 'Conditions, forecast, sounding and model comparison in the Location tab all follow that one click. Ctrl+K searches for a place instead.',
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
    title: 'Radar is three layers, not one',
    body: 'A global composite, a sharper CONUS mosaic, and single-site Level 2 that streams raw volumes once you zoom past z6. Level 2 gives you tilts, velocity and the 3D view; the mosaics give you coverage.',
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
