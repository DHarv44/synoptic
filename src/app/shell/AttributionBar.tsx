import { Anchor, Group, Text } from '@mantine/core'

interface Credit {
  label: string
  href: string
}

/** Visible attribution for every data source, as several require. */
const CREDITS: Credit[] = [
  { label: 'RainViewer', href: 'https://www.rainviewer.com/' },
  { label: 'NEXRAD · Iowa Environmental Mesonet', href: 'https://mesonet.agron.iastate.edu/' },
  { label: 'NWS', href: 'https://www.weather.gov/' },
  { label: 'Open-Meteo', href: 'https://open-meteo.com/' },
  { label: 'NASA GIBS', href: 'https://nasa-gibs.github.io/gibs-api-docs/' },
  { label: 'Blitzortung', href: 'https://www.blitzortung.org/' },
  { label: 'OpenFreeMap · OpenMapTiles · OpenStreetMap', href: 'https://openfreemap.org/' },
]

/** Footer credit strip; replaces the map's floating attribution control. */
export function AttributionBar() {
  return (
    <Group h="100%" px="sm" gap={6} wrap="nowrap" style={{ overflow: 'hidden' }}>
      <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
        Data:
      </Text>
      {CREDITS.map((c, i) => (
        <Group key={c.href} gap={6} wrap="nowrap">
          {i > 0 && (
            <Text size="xs" c="dimmed" opacity={0.4}>
              ·
            </Text>
          )}
          <Anchor
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            size="xs"
            c="dimmed"
            underline="hover"
            style={{ whiteSpace: 'nowrap' }}
          >
            {c.label}
          </Anchor>
        </Group>
      ))}
      <Text size="xs" c="dimmed" ml="auto" style={{ flexShrink: 0 }}>
        Not a substitute for official warnings
      </Text>
    </Group>
  )
}
