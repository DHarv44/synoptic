import { useEffect } from 'react'
import { ActionIcon, Badge, Group, Paper, Slider, Text, Tooltip } from '@mantine/core'
import { useHotkeys } from '@mantine/hooks'
import { IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react'
import {
  FUTURE_RANGE_MS,
  PAST_RANGE_MS,
  stepSimTime,
  useTimeline,
} from '@/core/time/timelineStore'
import { fmtUtcDateTime } from '@/core/time/format'
import { mapChromeStyle } from '@/ui/mapChrome'

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
 * Floating playback control: transport, clock and scrubber over the map.
 * Past is solid, the forecast half is hatched, and the now tick marks the
 * boundary — the timeline is honest about which side of "now" you're on.
 */
export function PlaybackControl() {
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
    <Paper
      withBorder
      radius="sm"
      p={6}
      style={{
        ...mapChromeStyle,
        position: 'absolute',
        bottom: 8,
        left: 8,
        zIndex: 5,
        width: 420,
        maxWidth: 'calc(100% - 76px)',
      }}
    >
      <Group gap={8} wrap="nowrap">
        <Tooltip label={playing ? 'Pause (space)' : 'Play (space)'}>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => setPlaying(!playing)}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? (
              <IconPlayerPause size={17} stroke={1.7} />
            ) : (
              <IconPlayerPlay size={17} stroke={1.7} />
            )}
          </ActionIcon>
        </Tooltip>
        <Text size="xs" ff="monospace" style={{ flexShrink: 0 }}>
          {fmtUtcDateTime(simTime)}
        </Text>
        <div style={{ flex: 1, position: 'relative', minWidth: 60 }}>
          <div
            style={{
              position: 'absolute',
              inset: '45% 0',
              pointerEvents: 'none',
              background:
                'repeating-linear-gradient(45deg, transparent 0 4px, var(--mantine-color-default-border) 4px 5px)',
              maskImage: `linear-gradient(to right, transparent ${nowPct}%, black ${nowPct}%)`,
              WebkitMaskImage: `linear-gradient(to right, transparent ${nowPct}%, black ${nowPct}%)`,
              opacity: 0.7,
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
    </Paper>
  )
}
