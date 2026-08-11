import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { Loader } from '@mantine/core'
import { mapChromeStyle } from '@/ui/mapChrome'

/** Scene axes are km east (+x) and km north (−z), matching volumeGeometry. */
function viewBearing(x: number, z: number): number {
  return (Math.atan2(x, -z) * 180) / Math.PI
}

/**
 * Reports the compass bearing the camera looks along. Must live inside the
 * Canvas — it needs the frame loop — and reports only on whole-degree
 * changes so orbiting doesn't re-render the overlay on every frame.
 */
export function CameraBearing({ onChange }: { onChange: (deg: number) => void }) {
  const dir = useRef(new Vector3())
  const last = useRef<number | null>(null)

  useFrame(({ camera }) => {
    camera.getWorldDirection(dir.current)
    const deg = Math.round((viewBearing(dir.current.x, dir.current.z) + 360) % 360) % 360
    if (deg !== last.current) {
      last.current = deg
      onChange(deg)
    }
  })

  return null
}

const PX_PER_DEG = 2.2
const BAR_H = 26
const STEP = 5
/**
 * Marks are laid out once across two full turns and the strip is translated,
 * so wrap-around needs no special case and orbiting only changes a transform.
 */
const FROM = -180
const TO = 540

const POINTS: Record<number, string> = {
  0: 'N',
  45: 'NE',
  90: 'E',
  135: 'SE',
  180: 'S',
  225: 'SW',
  270: 'W',
  315: 'NW',
}

function buildMarks(): React.ReactElement[] {
  const out: React.ReactElement[] = []
  for (let deg = FROM; deg <= TO; deg += STEP) {
    const norm = ((deg % 360) + 360) % 360
    const label = POINTS[norm]
    const major = norm % 15 === 0
    const north = norm === 0
    const color = label
      ? north
        ? 'var(--mantine-color-red-6)'
        : 'var(--mantine-color-text)'
      : 'var(--mantine-color-dimmed)'
    out.push(
      <div
        key={deg}
        style={{
          position: 'absolute',
          left: deg * PX_PER_DEG,
          top: 0,
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 1,
            height: label ? 9 : major ? 6 : 3,
            background: color,
            opacity: label ? 0.95 : major ? 0.7 : 0.45,
          }}
        />
        {label && (
          <div
            style={{
              marginTop: 2,
              fontSize: 9,
              fontWeight: 700,
              lineHeight: 1,
              color,
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </div>
        )}
      </div>,
    )
  }
  return out
}

const FADE = 'linear-gradient(to right, transparent, #000 14%, #000 86%, transparent)'

/**
 * Heading strip for the 3D view, read like a first-person compass: the tape
 * slides under a fixed centre index that marks the direction the camera
 * faces, so the cardinal letters always sit over their real bearing.
 */
export function ViewCompass({ bearing }: { bearing: number }) {
  const marks = useMemo(buildMarks, [])

  return (
    <div
      aria-label={`View bearing ${bearing} degrees`}
      role="img"
      style={{
        position: 'absolute',
        top: 8,
        left: 46,
        right: 46,
        zIndex: 3,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          ...mapChromeStyle,
          position: 'relative',
          height: BAR_H,
          borderRadius: 4,
          overflow: 'hidden',
          maskImage: FADE,
          WebkitMaskImage: FADE,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 4,
            height: '100%',
            transform: `translateX(${-bearing * PX_PER_DEG}px)`,
            willChange: 'transform',
          }}
        >
          {marks}
        </div>
      </div>

      {/* Fixed centre index — outside the masked tape so it never fades. */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '5px solid var(--mantine-color-red-6)',
          }}
        />
        <div
          style={{
            ...mapChromeStyle,
            marginTop: BAR_H - 5,
            padding: '0 5px',
            borderRadius: 3,
            fontSize: 10,
            fontWeight: 600,
            lineHeight: '15px',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--mantine-color-text)',
          }}
        >
          {String(bearing).padStart(3, '0')}°
        </div>
      </div>
    </div>
  )
}

/** Spinner for the 3D view, matching the map's loading indicator. */
export function ViewLoading() {
  return (
    <div
      aria-label="Loading volume"
      role="status"
      style={{
        ...mapChromeStyle,
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 3,
        width: 30,
        height: 30,
        borderRadius: 15,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <Loader size={16} color="gray" />
    </div>
  )
}
