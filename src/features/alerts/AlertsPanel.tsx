import { useEffect } from 'react'
import { Badge, Group, Paper, Stack, Text } from '@mantine/core'
import { fmtUtcDateTime } from '@/core/time/format'
import { alertColor } from '@/features/alerts/service'
import { acquireAlertsFeed, useAlerts } from '@/features/alerts/store'

const MAX_LISTED = 40

/** Active NWS alerts, most severe first. */
export function AlertsPanel() {
  const alerts = useAlerts((s) => s.alerts)
  useEffect(() => acquireAlertsFeed(), [])

  if (alerts.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        No active alerts (or NWS feed unreachable — check the health strip).
      </Text>
    )
  }

  return (
    <Stack gap={6}>
      <Text size="xs" c="dimmed">
        {alerts.length} active · US only · not a substitute for official warnings
      </Text>
      {alerts.slice(0, MAX_LISTED).map((a) => (
        <Paper key={a.id} withBorder p={6} radius="sm">
          <Group gap={6} wrap="nowrap" align="flex-start">
            <div
              style={{
                width: 4,
                alignSelf: 'stretch',
                borderRadius: 2,
                background: alertColor(a.properties.event),
              }}
            />
            <div style={{ minWidth: 0 }}>
              <Group gap={6} wrap="nowrap">
                <Text size="xs" fw={600} truncate>
                  {a.properties.event}
                </Text>
                <Badge size="xs" variant="outline" color="gray">
                  {a.properties.severity}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed" lineClamp={1}>
                {a.properties.areaDesc}
              </Text>
              <Text size="xs" c="dimmed" ff="monospace">
                until {fmtUtcDateTime(Date.parse(a.properties.expires))}
              </Text>
            </div>
          </Group>
        </Paper>
      ))}
    </Stack>
  )
}
