import { Anchor, Badge, Code, Divider, Group, Stack, Table, Text } from '@mantine/core'
import { DATA_CATALOG, type Assessment, type Dataset } from '@/app/help/dataCatalog'

const ASSESSMENT_COLOR: Record<Assessment, string> = {
  'best available': 'green',
  'upgrade candidate': 'yellow',
  adequate: 'gray',
}

function DatasetDoc({ d }: { d: Dataset }) {
  return (
    <Stack gap={6}>
      <Group gap={8} wrap="nowrap" align="baseline">
        <Text size="sm" fw={600}>
          {d.name}
        </Text>
        <Badge size="xs" variant="light" color={ASSESSMENT_COLOR[d.assessment]}>
          {d.assessment}
        </Badge>
      </Group>
      <Text size="xs" c="dimmed">
        <Anchor href={d.href} target="_blank" rel="noreferrer" c="dimmed" underline="always">
          {d.provider}
        </Anchor>{' '}
        · {d.transport}
      </Text>
      <Code block fz={11}>
        {d.endpoint}
      </Code>
      <Table withRowBorders={false} verticalSpacing={1} fz="xs">
        <Table.Tbody>
          <Table.Tr>
            <Table.Td c="dimmed">Cadence</Table.Td>
            <Table.Td>{d.cadence}</Table.Td>
            <Table.Td c="dimmed">Latency</Table.Td>
            <Table.Td>{d.latency}</Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td c="dimmed">Resolution</Table.Td>
            <Table.Td>{d.resolution}</Table.Td>
            <Table.Td c="dimmed">Coverage</Table.Td>
            <Table.Td>{d.coverage}</Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
      <Text size="xs" fw={600}>
        Parameters
      </Text>
      {d.params.map((p) => (
        <Text size="xs" key={p.name} pl="xs">
          <Code fz={11}>{p.name}</Code> — {p.value}
        </Text>
      ))}
      <Text size="xs">
        <Text span fw={600}>
          Used by:
        </Text>{' '}
        {d.usedBy.join(' · ')}
        {d.settings.length > 0 && (
          <>
            {'  ·  '}
            <Text span fw={600}>
              Settings:
            </Text>{' '}
            {d.settings.join(', ')}
          </>
        )}
      </Text>
      {d.unused.length > 0 && (
        <Text size="xs" c="dimmed">
          <Text span fw={600} c="dimmed">
            Unused capability:
          </Text>{' '}
          {d.unused.join(' · ')}
        </Text>
      )}
      <Text size="xs" fs="italic" c="dimmed">
        {d.note}
      </Text>
    </Stack>
  )
}

/** The data catalog, API-documentation style: every upstream, honestly assessed. */
export function DataPage() {
  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        Every dataset behind this display. All sources are free and keyless by project rule.
        Badges are an honest self-assessment: green means nothing better exists at any price,
        yellow means a known upgrade is on the board.
      </Text>
      {DATA_CATALOG.map((d, i) => (
        <Stack gap="sm" key={d.id}>
          {i > 0 && <Divider />}
          <DatasetDoc d={d} />
        </Stack>
      ))}
    </Stack>
  )
}
