import { useState } from 'react'
import { Badge, Group, Paper, Stack, Switch, Text } from '@mantine/core'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import { useCameraStore } from '@/map/cameraStore'
import type { Bbox } from '@/map/viewStore'
import { alertColor, type AlertFeature } from '@/features/alerts/service'
import { useVisibleAlerts } from '@/features/alerts/useVisibleAlerts'

const MAX_LISTED = 40

function AlertCard({ a, bbox }: { a: AlertFeature; bbox: Bbox | null }) {
  const requestFitBounds = useCameraStore((s) => s.requestFitBounds)
  const fmt = useTimeFormat()
  return (
    <Paper
      withBorder
      p={6}
      radius="sm"
      onClick={bbox ? () => requestFitBounds(bbox) : undefined}
      style={bbox ? { cursor: 'pointer' } : undefined}
    >
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
            until {fmt.dateTime(Date.parse(a.properties.expires))}
          </Text>
        </div>
      </Group>
    </Paper>
  )
}

/**
 * Active NWS alerts, most severe first, filtered to the current viewport.
 * Click a mapped (polygon) alert to zoom the map to it. Zone-based alerts
 * have no polygon — they're behind the "unmapped" switch and not clickable.
 */
export function AlertsPanel() {
  const [showUnmapped, setShowUnmapped] = useState(false)
  const { all: alerts, visible } = useVisibleAlerts(showUnmapped)

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
        {visible.length} in view · {alerts.length} active US-wide · not a substitute for
        official warnings
      </Text>
      <Switch
        size="xs"
        label="Include unmapped zone alerts"
        checked={showUnmapped}
        onChange={(e) => setShowUnmapped(e.currentTarget.checked)}
      />
      {visible.slice(0, MAX_LISTED).map(({ a, bbox }) => (
        <AlertCard key={a.id} a={a} bbox={bbox} />
      ))}
      {visible.length === 0 && (
        <Text size="xs" c="dimmed">
          No mapped alerts in the current view.
        </Text>
      )}
    </Stack>
  )
}
