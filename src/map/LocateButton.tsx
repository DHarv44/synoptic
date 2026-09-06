import { useState, type CSSProperties } from 'react'
import { ActionIcon, Tooltip } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCurrentLocation } from '@tabler/icons-react'
import { mapChromeStyle } from '@/ui/mapChrome'
import { useCameraStore } from '@/map/cameraStore'
import { useHome } from '@/core/home/store'
import { useProbe } from '@/core/probe/store'

const HOME_ZOOM = 9

/**
 * Centres the map on the user and remembers where that is. The position is
 * kept locally and only ever leaves as the coordinates of a forecast
 * request — the same thing a click on the map already does. The icon is
 * the plain locate glyph either way (a crossed-out one read as "disabled");
 * it takes the accent colour once a location is known.
 */
export function LocateButton({
  size = 34,
  floating = true,
  style,
}: {
  size?: number
  /** Absolutely positioned by `style` (desktop corner) or laid out by a parent (mobile column). */
  floating?: boolean
  style?: CSSProperties
}) {
  const [busy, setBusy] = useState(false)
  const home = useHome((s) => s.point)

  const locate = (): void => {
    if (!navigator.geolocation) {
      notifications.show({
        color: 'orange',
        title: 'Location unavailable',
        message: 'This browser does not offer geolocation.',
      })
      return
    }
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false)
        const point = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        useHome.getState().setHome(point)
        // Probe it too, so the analysis panels fill in for where you are.
        useProbe.getState().setPoint(point)
        useCameraStore.getState().requestFlyTo(point.lat, point.lon, HOME_ZOOM)
      },
      (err) => {
        setBusy(false)
        notifications.show({
          color: 'orange',
          title: 'Could not get your location',
          message:
            err.code === err.PERMISSION_DENIED
              ? 'Location permission was denied. You can still right-click (long-press on touch) anywhere on the map.'
              : err.message,
        })
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }

  return (
    <Tooltip label={home ? 'Back to my location' : 'Find my location'} position="left">
      <ActionIcon
        size={size}
        variant="default"
        loading={busy}
        aria-label="Center map on my location"
        onClick={locate}
        style={{
          ...mapChromeStyle,
          ...(floating ? { position: 'absolute', zIndex: 6 } : {}),
          borderRadius: size / 2,
          ...style,
        }}
      >
        <IconCurrentLocation
          size={Math.round(size * 0.55)}
          stroke={1.6}
          style={home ? { color: 'var(--mantine-primary-color-filled)' } : undefined}
        />
      </ActionIcon>
    </Tooltip>
  )
}
