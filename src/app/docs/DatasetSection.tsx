import { Anchor, Badge, Code, Group, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core'
import type { Assessment, Dataset } from '@/app/help/dataCatalog'

const ASSESSMENT_COLOR: Record<Assessment, string> = {
  'best available': 'green',
  'upgrade candidate': 'yellow',
  adequate: 'gray',
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text size="xs" c="dimmed" tt="uppercase" lts={0.5}>
        {label}
      </Text>
      <Text size="sm">{value}</Text>
    </div>
  )
}

/** One dataset as a full documentation section. */
export function DatasetSection({ d }: { d: Dataset }) {
  return (
    <Stack gap="md" id={d.id} style={{ scrollMarginTop: 70 }}>
      <div>
        <Group gap="sm" align="center">
          <Title order={2} fz="h3">
            {d.name}
          </Title>
          <Badge variant="light" color={ASSESSMENT_COLOR[d.assessment]}>
            {d.assessment}
          </Badge>
        </Group>
        <Text size="sm" c="dimmed" mt={4}>
          <Anchor href={d.href} target="_blank" rel="noreferrer">
            {d.provider}
          </Anchor>
          {' · '}
          {d.transport}
        </Text>
      </div>

      <Code block fz="sm" px="md" py="sm">
        {d.endpoint}
      </Code>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
        <Fact label="Cadence" value={d.cadence} />
        <Fact label="Latency" value={d.latency} />
        <Fact label="Resolution" value={d.resolution} />
        <Fact label="Coverage" value={d.coverage} />
      </SimpleGrid>

      <div>
        <Text size="sm" fw={600} mb={6}>
          Request parameters
        </Text>
        <Table withTableBorder verticalSpacing={6} fz="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={180}>Parameter</Table.Th>
              <Table.Th>Value and meaning</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {d.params.map((p) => (
              <Table.Tr key={p.name}>
                <Table.Td>
                  <Code fz="sm">{p.name}</Code>
                </Table.Td>
                <Table.Td>{p.value}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
        <div>
          <Text size="sm" fw={600}>
            Used by
          </Text>
          {d.usedBy.map((u) => (
            <Text size="sm" key={u}>
              • {u}
            </Text>
          ))}
          {d.settings.length > 0 && (
            <>
              <Text size="sm" fw={600} mt={8}>
                User settings
              </Text>
              {d.settings.map((s) => (
                <Text size="sm" key={s}>
                  • {s}
                </Text>
              ))}
            </>
          )}
        </div>
        <div>
          {d.unused.length > 0 && (
            <>
              <Text size="sm" fw={600}>
                Offered by the source, unused here
              </Text>
              {d.unused.map((u) => (
                <Text size="sm" c="dimmed" key={u}>
                  • {u}
                </Text>
              ))}
            </>
          )}
        </div>
      </SimpleGrid>

      <Text size="sm" fs="italic" c="dimmed">
        {d.note}
      </Text>
    </Stack>
  )
}
