import { useEffect } from 'react'
import { ActionIcon, Badge, Group, Slider, Text, Tooltip } from '@mantine/core'
import { useHotkeys } from '@mantine/hooks'
import {
  FUTURE_RANGE_MS,
  PAST_RANGE_MS,
  stepSimTime,
  useTimeline,
} from '@/core/time/timelineStore'
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

/**
 * Global timeline: −48h of observations (solid) through +16d of forecast
 * (hatched region right of the now marker).
 */
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
  const end = now + FUTURE_RANGE_MS
  const nowPct = ((now - start) / (end - start)) * 100

  return (
    <Group h="100%" px="md" gap="md" wrap="nowrap">
      <Tooltip label={playing ? 'Pause (space)' : 'Play (space)'}>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? '⏸' : '▶'}
        </ActionIcon>
      </Tooltip>
      <Text size="xs" ff="monospace" w={150} style={{ flexShrink: 0 }}>
        {fmtUtcDateTime(simTime)}
      </Text>
      <div style={{ flex: 1, position: 'relative' }}>
        {/* hatched forecast region + now tick behind the slider */}
        <div
          style={{
            position: 'absolute',
            inset: '45% 0',
            pointerEvents: 'none',
            background: `linear-gradient(to right, transparent ${nowPct}%, var(--mantine-color-default-border) ${nowPct}%, var(--mantine-color-default-border) calc(${nowPct}% + 2px), transparent calc(${nowPct}% + 2px)), repeating-linear-gradient(45deg, transparent 0 4px, var(--mantine-color-default-border) 4px 5px)`,
            backgroundClip: `border-box`,
            maskImage: `linear-gradient(to right, transparent ${nowPct}%, black ${nowPct}%)`,
            WebkitMaskImage: `linear-gradient(to right, transparent ${nowPct}%, black ${nowPct}%)`,
            opacity: 0.6,
            borderRadius: 2,
          }}
        />
        <Slider
          size="xs"
          min={start}
          max={end}
          value={simTime}
          onChange={setSimTime}
          label={(v) => fmtUtcDateTime(v)}
          aria-label="Timeline scrubber"
        />
      </div>
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
