import { Button, Group, Loader, Stack, Text } from '@mantine/core'
import { fetchJson } from '@/core/data/fetchJson'
import { useCachedFetch } from '@/core/data/useCachedFetch'
import { forecastUrl, OPEN_METEO, wmoText } from '@/core/data/openMeteo/forecast'
import type { OpenMeteoForecast } from '@/core/data/openMeteo/types'
import { useHome } from '@/core/home/store'
import { useProbe } from '@/core/probe/store'
import { useDock } from '@/app/shell/dockStore'
import { useUnits } from '@/core/units/useUnitSystem'
import { fmtLatLon, fmtTemp, fmtWind, fmtWindDir } from '@/core/units/format'

const CACHE_MAX_AGE_MS = 10 * 60_000

/**
 * The bare-map click card: what's here, right now, and what you can do
 * about it. Interrogating (retargeting every panel) is a button, not a
 * side effect. Same fetch key as the panels, so clicking pre-warms them.
 */
export function PointPopup({ lat, lon, onClose }: { lat: number; lon: number; onClose: () => void }) {
  const u = useUnits()
  const { data, loading } = useCachedFetch<OpenMeteoForecast>(
    `openmeteo:${lat.toFixed(2)},${lon.toFixed(2)}`,
    CACHE_MAX_AGE_MS,
    () => fetchJson<OpenMeteoForecast>(OPEN_METEO, forecastUrl(lat, lon), { fixture: 'openmeteo-forecast' }),
  )
  const cur = data?.current

  const interrogate = (): void => {
    useProbe.getState().setPoint({ lat, lon })
    useDock.getState().show('place')
    onClose()
  }
  const setHome = (): void => {
    useHome.getState().setHome({ lat, lon })
    onClose()
  }

  return (
    <Stack gap={6}>
      <Text size="xs" ff="monospace" c="dimmed">
        {fmtLatLon(lat, lon)}
      </Text>
      {loading && !cur && <Loader size="xs" />}
      {cur && (
        <Text size="sm">
          {wmoText(cur.weather_code)} · {fmtTemp(cur.temperature_2m, u.temp)} ·{' '}
          {fmtWindDir(cur.wind_direction_10m)} {fmtWind(cur.wind_speed_10m, u.wind)}
        </Text>
      )}
      <Group gap={6}>
        <Button size="compact-xs" variant="light" onClick={interrogate}>
          Interrogate
        </Button>
        <Button size="compact-xs" variant="subtle" color="gray" onClick={setHome}>
          Set home
        </Button>
      </Group>
    </Stack>
  )
}
