import { Table, Text } from '@mantine/core'
import { useProbe } from '@/core/probe/store'
import { useUnits } from '@/core/units/useUnitSystem'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import { fmtPrecip, fmtTemp } from '@/core/units/format'
import { useForecast } from '@/core/data/openMeteo/useForecast'
import { wmoText } from '@/core/data/openMeteo/forecast'
import { PanelGuard } from '@/ui/PanelGuard'
import { hourlySlice } from '@/features/forecast/service'

const HOURS = 24

/** Hour-by-hour for the next day at the probed point. */
export function HourlyPanel() {
  const point = useProbe((s) => s.point)
  const u = useUnits()
  const fmt = useTimeFormat()
  const { data, loading, error } = useForecast()

  const rows = data ? hourlySlice(data, Date.now(), HOURS) : []

  return (
    <PanelGuard error={error} loading={loading || !data}>
      {point && data && rows.length === 0 && (
        <Text size="xs" c="dimmed">
          No hourly data in range for this point.
        </Text>
      )}
      {point && rows.length > 0 && (
        <Table withRowBorders={false} verticalSpacing={2} fz="xs" horizontalSpacing={6}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>time</Table.Th>
              <Table.Th ta="right">temp</Table.Th>
              <Table.Th ta="right">precip</Table.Th>
              <Table.Th>conditions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r) => (
              <Table.Tr key={r.timeMs}>
                <Table.Td ff="monospace">{fmt.hm(r.timeMs)}</Table.Td>
                <Table.Td ta="right" ff="monospace">
                  {fmtTemp(r.tempC, u.temp)}
                </Table.Td>
                <Table.Td ta="right" ff="monospace" c={r.precipProb >= 40 ? undefined : 'dimmed'}>
                  {r.precipProb}%
                </Table.Td>
                <Table.Td c="dimmed">
                  {wmoText(r.code)}
                  {r.precipMm > 0 && ` · ${fmtPrecip(r.precipMm, u.precip)}`}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </PanelGuard>
  )
}
