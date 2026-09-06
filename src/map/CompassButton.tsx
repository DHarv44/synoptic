import type { CSSProperties } from 'react'
import { ActionIcon } from '@mantine/core'
import { IconNavigation } from '@tabler/icons-react'
import { useCameraStore } from '@/map/cameraStore'
import { useMapView } from '@/map/viewStore'
import { mapChromeStyle } from '@/ui/mapChrome'

/** Below this the map reads as north-up and the compass has nothing to say. */
const HIDE_BELOW_DEG = 0.5

/**
 * The phone-map compass: absent while the map is north-up and flat, and
 * once rotated or tilted a needle that turns with the map and snaps it
 * back on a tap.
 */
export function CompassButton({ size = 44, style }: { size?: number; style?: CSSProperties }) {
  const bearing = useMapView((s) => s.bearing)
  const pitch = useMapView((s) => s.pitch)
  const resetNorth = useCameraStore((s) => s.requestResetNorth)
  if (Math.abs(bearing) < HIDE_BELOW_DEG && pitch < HIDE_BELOW_DEG) return null

  return (
    <ActionIcon
      size={size}
      variant="default"
      aria-label="North up"
      onClick={resetNorth}
      style={{ ...mapChromeStyle, borderRadius: size / 2, ...style }}
    >
      <IconNavigation
        size={Math.round(size * 0.5)}
        stroke={1.6}
        style={{ transform: `rotate(${-bearing}deg)`, color: 'var(--mantine-color-red-6)' }}
      />
    </ActionIcon>
  )
}
