import { Anchor, Badge, Box, Container, Divider, Group, NavLink, Stack, Text, Title } from '@mantine/core'
import { DATA_CATALOG } from '@/app/help/dataCatalog'
import { DatasetSection } from '@/app/docs/DatasetSection'

const NAV_WIDTH = 250

/**
 * The data catalog as a real documentation page at /data — full width,
 * sidebar navigation, one section per dataset. The map shell never mounts
 * here; this is a document, not a workstation view.
 */
export function DataDocsPage() {
  return (
    <Box style={{ minHeight: '100vh' }}>
      <Group
        px="md"
        py="xs"
        justify="space-between"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--mantine-color-body)',
          borderBottom: '1px solid var(--mantine-color-default-border)',
        }}
      >
        <Group gap="xs">
          <Text fw={700} size="sm" ff="monospace" tt="uppercase" lts={2}>
            Synoptic
          </Text>
          <Text size="sm" c="dimmed">
            / Data documentation
          </Text>
        </Group>
        <Anchor href="/" size="sm">
          ← Back to the map
        </Anchor>
      </Group>

      <Group align="flex-start" gap={0} wrap="nowrap">
        <Box
          visibleFrom="sm"
          w={NAV_WIDTH}
          p="md"
          style={{ position: 'sticky', top: 45, flexShrink: 0 }}
        >
          {DATA_CATALOG.map((d) => (
            <NavLink
              key={d.id}
              href={`#${d.id}`}
              label={d.name}
              style={{ borderRadius: 4 }}
              py={4}
            />
          ))}
        </Box>

        <Container size="md" py="xl" px="lg" style={{ flexGrow: 1, minWidth: 0 }}>
          <Stack gap="xl">
            <div>
              <Title order={1} fz="h2">
                Data sources
              </Title>
              <Text size="sm" c="dimmed" mt={6} maw={640}>
                Every upstream dataset behind this display, documented the way its own API would
                be: the endpoint we call, the parameters we send, its cadence and latency, and
                what it offers that we have not built yet. All sources are free and keyless by
                project rule. Assessment badges are honest:{' '}
                <Badge size="xs" variant="light" color="green">
                  best available
                </Badge>{' '}
                means nothing better exists at any price,{' '}
                <Badge size="xs" variant="light" color="yellow">
                  upgrade candidate
                </Badge>{' '}
                means a known improvement is on the roadmap.
              </Text>
            </div>
            {DATA_CATALOG.map((d) => (
              <Stack gap="xl" key={d.id}>
                <Divider />
                <DatasetSection d={d} />
              </Stack>
            ))}
          </Stack>
        </Container>
      </Group>
    </Box>
  )
}
