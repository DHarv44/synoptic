import { useEffect } from 'react'
import { ActionIcon, Badge, Group, Slider, Text, Tooltip } from '@mantine/core'
import { useHotkeys } from '@mantine/hooks'
import { useTimeline, stepSimTime, PAST_RANGE_MS } from '@/core/time/timelineStore'
import { fmtUtcDateTime } from '@/core/time/format'

const STEP_MS = 10 * 60_000 // ←/→ step: 10 min

/** Clock driver: ticks the timeline store while mounted. */
function useTimelineClock() {
  const tick = useTimeline((s) => s.tick)
  useEffect(() => {
    let last = performance.now()
    const id = setInterval(() => {
      const now = performance.now()
      tick(now - last)
      last = now
    }, 250)
    return () => clearInterval(id)
  }, [tick])
}

/** Global timeline (bottom bar): scrubber + transport. −48h → now for S4. */
export function TimelineBar() {
  useTimelineClock()
  const simTime = useTimeline((s) => s.simTime)
  const isLive = useTimeline((s) => s.isLive)
  const playing = useTimeline((s) => s.playing)
  const setSimTime = useTimeline((s) => s.setSimTime)
  const setPlaying = useTimeline((s) => s.setPlaying)
  const goLive = useTimeline((s) => s.goLive)

  useHotkeys([
    ['space', () => setPlaying(!playing)],
    ['ArrowLeft', () => stepSimTime(-STEP_MS)],
    ['ArrowRight', () => stepSimTime(STEP_MS)],
  ])

  const now = Date.now()
  const start = now - PAST_RANGE_MS

  return (
    <Group h="100%" px="md" gap="md" wrap="nowrap">
      <Tooltip label={playing ? 'Pause (space)' : 'Play (space)'}>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? 'Pause' : 'Play'}
          disabled={isLive && !playing}
        >
          {playing ? '⏸' : '▶'}
        </ActionIcon>
      </Tooltip>
      <Text size="xs" ff="monospace" w={150} style={{ flexShrink: 0 }}>
        {fmtUtcDateTime(simTime)}
      </Text>
      <Slider
        flex={1}
        size="xs"
        min={start}
        max={now}
        value={simTime}
        onChange={setSimTime}
        label={(v) => fmtUtcDateTime(v)}
        aria-label="Timeline scrubber"
      />
      <Badge
        variant={isLive ? 'filled' : 'outline'}
        color={isLive ? 'red' : 'gray'}
        size="sm"
        style={{ cursor: 'pointer', flexShrink: 0 }}
        onClick={goLive}
      >
        LIVE
      </Badge>
    </Group>
  )
}
