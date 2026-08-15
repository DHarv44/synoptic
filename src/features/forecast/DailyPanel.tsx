import { SegmentedControl, Stack, Table, Text } from '@mantine/core'
import { useState } from 'react'
import { useProbe } from '@/core/probe/store'
import { useUnits } from '@/core/units/useUnitSystem'
import { fmtPrecip, fmtTemp, fmtWind } from '@/core/units/format'
import { useForecast } from '@/core/data/openMeteo/useForecast'
import { wmoText } from '@/core/data/openMeteo/forecast'
import { PanelGuard } from '@/ui/PanelGuard'
import { dailyRows, dayLabel } from '@/features/forecast/service'
import { ModelAgreement } from '@/features/models/ModelAgreement'

const RANGES = ['3', '5', '10'] as const

/** Multi-day outlook for the probed point, 3 / 5 / 10 days. */
export function DailyPanel() {
  const point = useProbe((s) => s.point)
  const u = useUnits()
  const [range, setRange] = useState<string>('5')
  const { data, loading, error } = useForecast()

  const now = Date.now()
  const rows = data ? dailyRows(data, Number(range)) : []

  return (
    <PanelGuard error={error} loading={loading || !data}>
      {point && data && rows.length === 0 && (
        <Text size="xs" c="dimmed">
          This forecast response carries no daily outlook.
        </Text>
      )}
      {point && rows.length > 0 && (
        <Stack gap={6}>
          <SegmentedControl
            size="xs"
            fullWidth
            value={range}
            onChange={setRange}
            data={RANGES.map((r) => ({ value: r, label: `${r} day` }))}
          />
          <Table withRowBorders={false} verticalSpacing={3} fz="xs" horizontalSpacing={6}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>day</Table.Th>
                <Table.Th ta="right">hi / lo</Table.Th>
                <Table.Th ta="right">precip</Table.Th>
                <Table.Th>conditions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((r) => (
                <Table.Tr key={r.date}>
                  <Table.Td>{dayLabel(r.date, now)}</Table.Td>
                  <Table.Td ta="right" ff="monospace">
                    {fmtTemp(r.highC, u.temp)}
                    <Text component="span" c="dimmed">
                      {' / '}
                      {fmtTemp(r.lowC, u.temp)}
                    </Text>
                  </Table.Td>
                  <Table.Td ta="right" ff="monospace" c={r.precipProb >= 40 ? undefined : 'dimmed'}>
                    {r.precipProb}%
                  </Table.Td>
                  <Table.Td c="dimmed">
                    {wmoText(r.code)}
                    {r.precipMm > 0 && ` · ${fmtPrecip(r.precipMm, u.precip)}`}
                    {r.gustMs >= 15 && ` · gusts ${fmtWind(r.gustMs, u.wind)}`}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <ModelAgreement />
        </Stack>
      )}
    </PanelGuard>
  )
}
