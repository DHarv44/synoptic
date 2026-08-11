import { Alert, Anchor, Group, Stack, Table, Text, Title } from '@mantine/core'
import { IconAlertTriangle, IconBrandGithub } from '@tabler/icons-react'
import { CREDITS } from '@/app/help/credits'

const REPO = 'https://github.com/DHarv44/synoptic'

export function About() {
  return (
    <Stack gap="md">
      <div>
        <Title order={5}>SYNOPTIC</Title>
        <Text size="sm" c="dimmed">
          A web-native weather workstation built entirely on free public data — no
          account, no key, nothing behind a paywall.
        </Text>
      </div>

      <Alert
        icon={<IconAlertTriangle size={16} />}
        color="orange"
        variant="light"
        p="xs"
        title="Not a substitute for official warnings"
      >
        <Text size="xs">
          Feeds can lag or fail, and some products here are derived in the browser
          rather than issued. For decisions about safety, use your national weather
          service.
        </Text>
      </Alert>

      <Table withRowBorders={false} verticalSpacing={2} fz="sm">
        <Table.Tbody>
          <Table.Tr>
            <Table.Td c="dimmed" w={90}>
              Version
            </Table.Td>
            <Table.Td ff="monospace">{__APP_VERSION__}</Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td c="dimmed">License</Table.Td>
            <Table.Td>MIT</Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td c="dimmed">Source</Table.Td>
            <Table.Td>
              <Anchor href={REPO} target="_blank" rel="noopener noreferrer" size="sm">
                <Group gap={4} wrap="nowrap" component="span">
                  <IconBrandGithub size={14} />
                  DHarv44/synoptic
                </Group>
              </Anchor>
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>

      <Stack gap={6}>
        <Text size="xs" fw={700} tt="uppercase" lts={0.8} c="dimmed">
          Data sources
        </Text>
        {CREDITS.map((c) => (
          <div key={c.href}>
            <Anchor href={c.href} target="_blank" rel="noopener noreferrer" size="sm">
              {c.label}
            </Anchor>
            <Text size="xs" c="dimmed">
              {c.what}
            </Text>
          </div>
        ))}
      </Stack>
    </Stack>
  )
}
