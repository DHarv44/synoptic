import { useEffect, useRef } from 'react'
import { ActionIcon, Badge, Group, Menu, Paper, Slider, Tooltip } from '@mantine/core'
import { useHotkeys } from '@mantine/hooks'
import { IconGauge, IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react'
import {
  FRAME_SPEEDS,
  LOOP_END_HOLD,
  loopStart,
  newestFrame,
  stepSimTime,
  useTimeline,
} from '@/core/time/timelineStore'
import { TimeStepper } from '@/app/shell/TimeStepper'
import { computeSyncLag } from '@/core/time/syncLag'
import { useSettings } from '@/core/settings/store'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import { useAvailableTools } from '@/app/shell/toolRegistry'
import { RAIL_WIDTH } from '@/app/shell/ToolRail'
import { MOBILE_PLAYBACK_BOTTOM } from '@/app/shell/mobileLayout'
import { mapChromeStyle } from '@/ui/mapChrome'

const STEP_MS = 10 * 60_000 // ←/→ step: 10 min

/**
 * The scrubber covers the recent past only — six hours at this width puts a
 * 5-minute frame a comfortable few pixels apart. Anything further (deep
 * history, the forecast side) is the steppers' job: a 64-day slider put five
 * HOURS in every pixel, which is why no one could land on a frame with it.
 */
const SCRUB_WINDOW_MS = 6 * 3600_000

const SPEED_LABELS = ['Slow', 'Medium', 'Fast', 'Fastest'] as const

/** Below this many warmed frames the loop is still visibly filling in. */
const MIN_SMOOTH_FRAMES = 6

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
 * Floating playback control: transport, steppable clock, and a fine-grained
 * scrubber over the recent past. The clock segments step day/hour/10-min —
 * any moment is a few precise clicks away, and play from a historical
 * position sweeps forward to now instead of yanking back to the live loop.
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
  const warmFrames = useTimeline((s) => s.warmFrames)
  const mode = useTimeline((s) => s.mode)
  const setMode = useTimeline((s) => s.setMode)
  const syncLagMs = useTimeline((s) => s.syncLagMs)
  const setSyncLag = useTimeline((s) => s.setSyncLag)

  // The sync hold-back follows whatever layers are enabled right now:
  // toggling satellite on pulls the loop back, toggling it off releases it.
  const featuresState = useSettings((s) => s.features)
  useEffect(() => {
    setSyncLag(computeSyncLag())
  }, [featuresState, setSyncLag])
  const syncMin = Math.max(1, Math.round(syncLagMs / 60_000))
  // The left tool rail only exists once a tool does — the radar workbench
  // appears with Level 2 — and it draws above this bar, so it landed on top
  // of the transport controls the moment you zoomed in far enough.
  const railVisible = useAvailableTools().length > 0 && !isMobile
  const fmt = useTimeFormat()
  const speedLabel = SPEED_LABELS[FRAME_SPEEDS.indexOf(frameMs as never)] ?? 'Custom'
  // Early on, the loop cycles two or three frames while the rest load. Saying
  // so is the difference between "still filling in" and "this is broken".
  const buffering = playing && warmFrames !== null && warmFrames < MIN_SMOOTH_FRAMES

  useHotkeys([
    ['space', () => setPlaying(!playing)],
    ['ArrowLeft', () => stepSimTime(-STEP_MS)],
    ['ArrowRight', () => stepSimTime(STEP_MS)],
  ])

  const now = Date.now()
  const scrubStart = now - SCRUB_WINDOW_MS
  // Play means different things by playhead position; say which one it is.
  const willSweep = !isLive && simTime < loopStart(now)

  return (
    <Paper
      withBorder
      radius="sm"
      p={6}
      style={{
        ...mapChromeStyle,
        position: 'absolute',
        // Mobile: full width just above the sheet peek. Desktop: bottom-left.
        bottom: isMobile ? MOBILE_PLAYBACK_BOTTOM : 8,
        left: railVisible ? RAIL_WIDTH + 15 : 15,
        right: isMobile ? 15 : undefined,
        zIndex: 5,
        width: isMobile ? undefined : 420,
        // Desktop reserve clears the rail plus the reorient button.
        maxWidth: isMobile ? undefined : 'calc(100% - 118px)',
      }}
    >
      <Group gap={8} wrap="nowrap">
        <Tooltip
          label={
            buffering
              ? 'Loading frames…'
              : playing
                ? 'Pause (space)'
                : willSweep
                  ? 'Play forward from here (space)'
                  : 'Play the last hour (space)'
          }
        >
          <ActionIcon
            variant="subtle"
            color={buffering ? 'blue' : 'gray'}
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
        <TimeStepper />
        <div style={{ flex: 1, minWidth: 60 }}>
          <Slider
            size="xs"
            min={scrubStart}
            max={now}
            value={Math.min(Math.max(simTime, scrubStart), now)}
            onChange={setSimTime}
            label={(v) => fmt.dateTime(v)}
            aria-label="Timeline scrubber"
          />
        </div>
        <Tooltip
          label={
            mode === 'sync'
              ? `Synced loop: every animating layer has real frames, ${syncMin} min behind live. Click to jump to now.`
              : 'Click to jump to now.'
          }
        >
          <Badge
            variant={isLive || (mode === 'sync' && playing) ? 'filled' : 'outline'}
            color={mode === 'sync' && playing ? 'yellow' : isLive ? 'red' : 'gray'}
            size="sm"
            style={{ cursor: 'pointer', flexShrink: 0 }}
            onClick={goLive}
          >
            {mode === 'sync' && playing ? `SYNC −${syncMin}M` : 'LIVE'}
          </Badge>
        </Tooltip>
        {/*
          Speed lives at the far end, not beside play. Sitting next to it —
          same size, same colour — it turned the left edge of the bar into two
          interchangeable circles, and the transport control stopped being
          findable at a glance.
        */}
        <Menu position="top-end" withinPortal>
          <Menu.Target>
            <Tooltip label={`Loop speed: ${speedLabel}`}>
              <ActionIcon variant="subtle" color="gray" size="sm" aria-label="Loop speed">
                <IconGauge size={15} stroke={1.6} />
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
            <Menu.Label>Loop timing</Menu.Label>
            <Menu.Item onClick={() => setMode('live')} fw={mode === 'live' ? 600 : undefined}>
              Live — freshest radar, laggy layers freeze
            </Menu.Item>
            <Menu.Item onClick={() => setMode('sync')} fw={mode === 'sync' ? 600 : undefined}>
              {`Synced — all layers move together, −${syncMin} min`}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Paper>
  )
}
