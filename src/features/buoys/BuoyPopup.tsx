import { Stack, Table, Text } from '@mantine/core'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import { useUnits } from '@/core/units/useUnitSystem'
import { fmtPressure, fmtTemp, fmtWind, fmtWindDir } from '@/core/units/format'
import { waveLabel } from '@/features/buoys/service'
import type { MapPopupProps } from '@/map/popups/registry'

const num = (v: unknown): number | null => (typeof v === 'number' ? v : null)

/** One buoy's observation, aged honestly, in the user's units. */
export function BuoyPopup({ properties }: MapPopupProps) {
  const u = useUnits()
  const fmt = useTimeFormat()
  const timeMs = num(properties.timeMs)
  const ageMin = timeMs !== null ? Math.round((Date.now() - timeMs) / 60_000) : null
  const wvht = num(properties.wvht)
  const dpd = num(properties.dpd)
  const wspd = num(properties.wspd)
  const gst = num(properties.gst)
  const wdir = num(properties.wdir)
  const atmp = num(properties.atmp)
  const wtmp = num(properties.wtmp)
  const pres = num(properties.pres)

  const rows: Array<[string, string]> = []
  if (wvht !== null) {
    rows.push(['Waves', `${waveLabel(wvht, u.system)}${dpd !== null ? ` @ ${dpd}s` : ''}`])
  }
  if (wspd !== null) {
    rows.push([
      'Wind',
      `${wdir !== null ? `${fmtWindDir(wdir)} ` : ''}${fmtWind(wspd, u.wind)}${gst !== null ? ` G ${fmtWind(gst, u.wind)}` : ''}`,
    ])
  }
  if (wtmp !== null) rows.push(['Water', fmtTemp(wtmp, u.temp)])
  if (atmp !== null) rows.push(['Air', fmtTemp(atmp, u.temp)])
  if (pres !== null) rows.push(['Pressure', fmtPressure(pres, u.pressure)])

  return (
    <Stack gap={4}>
      <Text size="sm" fw={600}>
        Buoy {String(properties.id ?? '')}
      </Text>
      {timeMs !== null && (
        <Text size="xs" c="dimmed">
          {fmt.hm(timeMs)} · {ageMin} min ago
        </Text>
      )}
      <Table withRowBorders={false} verticalSpacing={1} fz="xs" data={{ body: rows }} />
    </Stack>
  )
}
