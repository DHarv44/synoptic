import { ActionIcon, Group, Text, Tooltip } from '@mantine/core'
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { stepSimTime, useTimeline } from '@/core/time/timelineStore'
import { useTimeFormat } from '@/core/time/useTimeFormat'

const MINUTE_STEP_MS = 10 * 60_000
const HOUR_MS = 3600_000
const DAY_MS = 24 * 3600_000

/** One clock segment: value with a nudge up and down, zoom.earth-style. */
function Segment({
  value,
  stepMs,
  label,
  width,
}: {
  value: string
  stepMs: number
  label: string
  width: number
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width }}>
      <Tooltip label={`Forward ${label}`} openDelay={400}>
        <ActionIcon
          variant="subtle"
          color="gray"
          size={18}
          onClick={() => stepSimTime(stepMs)}
          aria-label={`Forward ${label}`}
        >
          <IconChevronUp size={14} stroke={1.8} />
        </ActionIcon>
      </Tooltip>
      <Text size="xs" ff="monospace" lh={1.1}>
        {value}
      </Text>
      <Tooltip label={`Back ${label}`} openDelay={400}>
        <ActionIcon
          variant="subtle"
          color="gray"
          size={18}
          onClick={() => stepSimTime(-stepMs)}
          aria-label={`Back ${label}`}
        >
          <IconChevronDown size={14} stroke={1.8} />
        </ActionIcon>
      </Tooltip>
    </div>
  )
}

/**
 * The clock as a control: day, hour and minute segments each stepped by
 * their own unit, so any moment in the ±window is a few precise clicks away
 * — no aiming a 48-hour slider at a 10-minute frame. Honours the UTC/local
 * display preference like every other timestamp.
 */
export function TimeStepper() {
  const simTime = useTimeline((s) => s.simTime)
  const zone = useTimeFormat().zone
  const d = new Date(simTime)
  const utc = zone === 'utc'
  const day = utc
    ? d.toLocaleString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    : d.toLocaleString('en-GB', { day: 'numeric', month: 'short' })
  const hour = String(utc ? d.getUTCHours() : d.getHours()).padStart(2, '0')
  const minute = String(utc ? d.getUTCMinutes() : d.getMinutes()).padStart(2, '0')

  return (
    <Group gap={2} wrap="nowrap" style={{ flexShrink: 0 }}>
      <Segment value={day} stepMs={DAY_MS} label="one day" width={44} />
      <Segment value={hour} stepMs={HOUR_MS} label="one hour" width={24} />
      <Text size="xs" ff="monospace" c="dimmed">
        :
      </Text>
      <Segment value={minute} stepMs={MINUTE_STEP_MS} label="10 minutes" width={24} />
      {zone === 'utc' && (
        <Text size="xs" c="dimmed" style={{ alignSelf: 'center' }}>
          Z
        </Text>
      )}
    </Group>
  )
}
