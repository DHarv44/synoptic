import { useEffect, useRef } from 'react'
import { ActionIcon, Badge, Group, Menu, Paper, Slider, Text, Tooltip } from '@mantine/core'
import { useHotkeys } from '@mantine/hooks'
import { IconGauge, IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react'
import {
  FRAME_SPEEDS,
  FUTURE_RANGE_MS,
  LOOP_END_HOLD,
  PAST_RANGE_MS,
  newestFrame,
  stepSimTime,
  useTimeline,
} from '@/core/time/timelineStore'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import { mapChromeStyle } from '@/ui/mapChrome'

const STEP_MS = 10 * 60_000 // ←/→ step: 10 min

const SPEED_LABELS = ['Slow', 'Medium', 'Fast', 'Fastest'] as const

/** Follows the wall clock while live. Cheap: the store no-ops between steps. */
function useLiveClock() {
  const tick = useTimeline((s) => s.tick)
  useEffect(() => {
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [tick])
}

/**
 * Loop driver. Each frame schedules the next, so the accumulator never lives
 * in the store — keeping a counter there would notify every subscriber
 * several times a second to say nothing had changed yet.
 *
 * Changing speed re-times the frame already on screen instead of restarting
 * it. Rescheduling from scratch charged a full new dwell on top of however
 * long the frame had already been up, so switching to a faster speed still
 * held that frame for the old duration — the change felt like it lagged a
 * beat behind the button.
 */
function useLoopDriver() {
  const playing = useTimeline((s) => s.playing)
  const frameMs = useTimeline((s) => s.frameMs)
  const shownAt = useRef(0)
  useEffect(() => {
    if (!playing) return
    let timer = 0
    const schedule = (): void => {
      const onNewest = useTimeline.getState().simTime >= newestFrame(Date.now())
      const dwell = onNewest ? frameMs * LOOP_END_HOLD : frameMs
      const elapsed = Date.now() - shownAt.current
      timer = window.setTimeout(
        () => {
          useTimeline.getState().advanceFrame()
          shownAt.current = Date.now()
          schedule()
        },
        Math.max(0, dwell - elapsed),
      )
    }
    if (shownAt.current === 0) shownAt.current = Date.now()
    schedule()
    return () => window.clearTimeout(timer)
  }, [playing, frameMs])

  // A fresh press of play starts its first frame's clock now, not from
  // whenever the previous session happened to stop.
  useEffect(() => {
    if (playing) shownAt.current = Date.now()
  }, [playing])
}

/**
 * Floating playback control: transport, clock and scrubber over the map.
 * Past is solid, the forecast half is hatched, and the now tick marks the
 * boundary — the timeline is honest about which side of "now" you're on.
 */
export function PlaybackControl({ isMobile = false }: { isMobile?: boolean }) {
  useLiveClock()
  useLoopDriver()
  const simTime = useTimeline((s) => s.simTime)
  const isLive = useTimeline((s) => s.isLive)
  const playing = useTimeline((s) => s.playing)
  const frameMs = useTimeline((s) => s.frameMs)
  const setSimTime = useTimeline((s) => s.setSimTime)
  const setPlaying = useTimeline((s) => s.setPlaying)
  const setFrameMs = useTimeline((s) => s.setFrameMs)
  const goLive = useTimeline((s) => s.goLive)
  const fmt = useTimeFormat()
  const speedLabel = SPEED_LABELS[FRAME_SPEEDS.indexOf(frameMs as never)] ?? 'Custom'

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
        // Mobile: full width just above the sheet peek. Desktop: bottom-left.
        bottom: isMobile ? 64 : 8,
        left: 8,
        right: isMobile ? 8 : undefined,
        zIndex: 5,
        width: isMobile ? undefined : 420,
        // Desktop reserve clears the rail plus the reorient button.
        maxWidth: isMobile ? undefined : 'calc(100% - 118px)',
      }}
    >
      <Group gap={8} wrap="nowrap">
        <Tooltip label={playing ? 'Pause (space)' : 'Play the last hour (space)'}>
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
        <Menu position="top-start" withinPortal>
          <Menu.Target>
            <Tooltip label={`Loop speed: ${speedLabel}`}>
              <ActionIcon variant="subtle" color="gray" aria-label="Loop speed">
                <IconGauge size={17} stroke={1.7} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Loop speed</Menu.Label>
            {FRAME_SPEEDS.map((ms, i) => (
              <Menu.Item
                key={ms}
                onClick={() => setFrameMs(ms)}
                fw={ms === frameMs ? 600 : undefined}
              >
                {SPEED_LABELS[i]}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
        <Text size="xs" ff="monospace" style={{ flexShrink: 0 }}>
          {isMobile ? fmt.hm(simTime) : fmt.dateTime(simTime)}
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
            label={(v) => fmt.dateTime(v)}
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
