import { useState } from 'react'
import { Badge, Button, Group, Stack, Text } from '@mantine/core'
import { useHome } from '@/core/home/store'
import { alertColor } from '@/features/alerts/service'
import { acquireAlertsFeed, useAlertsData } from '@/features/alerts/store'
import { alertsAtPoint } from '@/features/notify/service'
import { useEffect } from 'react'

type Permission = 'default' | 'granted' | 'denied' | 'unsupported'

function currentPermission(): Permission {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

/**
 * What is in force where the user actually is, plus the opt-in for desktop
 * notifications. Permission has to be requested from a click, so it lives
 * here rather than in the generated settings form.
 */
export function HomeAlertsPanel() {
  const home = useHome((s) => s.point)
  const alerts = useAlertsData()
  const [permission, setPermission] = useState<Permission>(currentPermission)
  useEffect(() => acquireAlertsFeed(), [])

  if (!home) {
    return (
      <Text size="xs" c="dimmed">
        No home location yet. Use the locate button on the map and warnings covering
        you will be listed here.
      </Text>
    )
  }

  const mine = alertsAtPoint(alerts, home)

  return (
    <Stack gap="xs">
      {mine.length === 0 ? (
        <Text size="xs" c="dimmed">
          Nothing in force at your location.
        </Text>
      ) : (
        mine.map((a) => (
          <Group key={a.id} gap={6} wrap="nowrap" align="flex-start">
            <Badge size="xs" variant="light" color="gray" style={{ color: alertColor(a.properties.event) }}>
              {a.properties.severity}
            </Badge>
            <div style={{ minWidth: 0 }}>
              <Text size="xs" fw={600}>
                {a.properties.event}
              </Text>
              <Text size="xs" c="dimmed">
                {a.properties.areaDesc}
              </Text>
            </div>
          </Group>
        ))
      )}

      {permission === 'unsupported' && (
        <Text size="xs" c="dimmed">
          This browser has no notification support.
        </Text>
      )}
      {permission === 'default' && (
        <Button
          size="compact-xs"
          variant="light"
          onClick={() => {
            void Notification.requestPermission().then((p) => setPermission(p as Permission))
          }}
        >
          Notify me about warnings here
        </Button>
      )}
      {permission === 'granted' && (
        <Text size="xs" c="dimmed">
          Desktop notifications on for warnings covering your location. Severity
          threshold is in Settings.
        </Text>
      )}
      {permission === 'denied' && (
        <Text size="xs" c="dimmed">
          Notifications are blocked for this site — your browser's site settings
          control that.
        </Text>
      )}
    </Stack>
  )
}
