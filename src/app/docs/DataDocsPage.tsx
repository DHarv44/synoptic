import { useEffect, useRef, useState } from 'react'
import { Anchor, Box, Container, Group, NavLink, Text } from '@mantine/core'
import { DATA_CATALOG } from '@/app/help/dataCatalog'
import { DatasetSection } from '@/app/docs/DatasetSection'

const NAV_WIDTH = 300
const HEADER_H = 45

/**
 * The data catalog as a real documentation page at /data — sidebar picks a
 * dataset, the content pane documents that one alone. Selection rides in
 * the URL hash so a dataset is linkable. The map shell never mounts here,
 * and the page is its own scroll container because global.css locks body
 * scrolling for the map.
 */
export function DataDocsPage() {
  const [selected, setSelected] = useState(() => {
    const hash = window.location.hash.slice(1)
    return DATA_CATALOG.some((d) => d.id === hash) ? hash : DATA_CATALOG[0].id
  })
  const scrollerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 0 })
  }, [selected])
  const dataset = DATA_CATALOG.find((d) => d.id === selected) ?? DATA_CATALOG[0]

  return (
    <Box ref={scrollerRef} style={{ height: '100vh', overflowY: 'auto' }}>
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
          style={{
            position: 'sticky',
            top: HEADER_H,
            flexShrink: 0,
            maxHeight: `calc(100vh - ${HEADER_H}px)`,
            overflowY: 'auto',
          }}
        >
          {DATA_CATALOG.map((d) => (
            <NavLink
              key={d.id}
              href={`#${d.id}`}
              label={d.name}
              active={d.id === selected}
              onClick={(e) => {
                e.preventDefault()
                setSelected(d.id)
                window.history.replaceState(null, '', `#${d.id}`)
              }}
              style={{ borderRadius: 4 }}
              styles={{ label: { whiteSpace: 'nowrap' } }}
              py={4}
            />
          ))}
        </Box>

        <Container size="md" py="xl" px="lg" style={{ flexGrow: 1, minWidth: 0 }}>
          <DatasetSection d={dataset} />
        </Container>
      </Group>
    </Box>
  )
}
