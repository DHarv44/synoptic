import { Divider, Stack, Table, Text } from '@mantine/core'
import { useRadar } from '@/features/radar/level2/store'
import { RadarControls } from '@/features/radar/level2/RadarControls'

const EFFECTIVE_EARTH_R = (4 / 3) * 6_371_000
const DEG = Math.PI / 180

function beamKft(rangeM: number, elevDeg: number): number {
  const h = rangeM * Math.sin(elevDeg * DEG) + (rangeM * rangeM) / (2 * EFFECTIVE_EARTH_R)
  return (h * 3.28084) / 1000
}

function fmtValue(moment: string, v: number): string {
  if (moment === 'REF') return `${v.toFixed(1)} dBZ`
  if (moment === 'VEL' || moment === 'SW') return `${v.toFixed(1)} m/s`
  if (moment === 'ZDR') return `${v.toFixed(2)} dB`
  if (moment === 'PHI') return `${v.toFixed(0)}°`
  if (moment === 'RHO') return v.toFixed(3)
  return v.toFixed(1)
}

/**
 * The radar's home: what it's showing and how to change it, then the
 * numbers behind the current volume — every moment at the probed gate, and
 * that gate's values through the whole column (All-Tilts) at true beam
 * heights. Controls sit first so they're reachable without scrolling,
 * which is what makes this usable at the mobile sheet's half height.
 */
export function RadarReadouts() {
  const site = useRadar((s) => s.site)
  const probe = useRadar((s) => s.probe)
  const column = useRadar((s) => s.column)

  return (
    <Stack gap="xs">
      <RadarControls />
      <Divider />

      {!site && (
        <Text size="xs" c="dimmed">
          No radar attached. Zoom in past z6 over the United States and the nearest
          WSR-88D takes over, or pick one above — this is a single radar at full
          resolution rather than the blended national mosaic.
        </Text>
      )}

      {site && !probe && (
        <Text size="xs" c="dimmed">
          Click the radar echo on the map to read gate values here.
        </Text>
      )}

      {probe && (
        <>
          <Text size="xs" c="dimmed" ff="monospace">
            {Math.round(probe.azDeg)}° · {(probe.rangeM / 1000).toFixed(0)} km · beam{' '}
            {probe.beamKft.toFixed(1)} kft
          </Text>
          <Table withRowBorders={false} verticalSpacing={2} fz="xs">
            <Table.Tbody>
              {Object.entries(probe.values).map(([k, v]) => (
                <Table.Tr key={k}>
                  <Table.Td c="dimmed">{k}</Table.Td>
                  <Table.Td ta="right" ff="monospace">
                    {fmtValue(k, v)}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </>
      )}

      {probe && column && column.length > 1 && (
        <>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={0.8}>
            All tilts
          </Text>
          <Table withRowBorders={false} verticalSpacing={1} fz="xs" ff="monospace">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>tilt</Table.Th>
                <Table.Th ta="right">kft</Table.Th>
                <Table.Th ta="right">dBZ</Table.Th>
                <Table.Th ta="right">m/s</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {[...column].reverse().map((e) => (
                <Table.Tr key={e.elevNum}>
                  <Table.Td>{e.elevationDeg.toFixed(1)}°</Table.Td>
                  <Table.Td ta="right">{beamKft(probe.rangeM, e.elevationDeg).toFixed(0)}</Table.Td>
                  <Table.Td ta="right">{e.REF !== null ? e.REF.toFixed(0) : '—'}</Table.Td>
                  <Table.Td ta="right">{e.VEL !== null ? e.VEL.toFixed(0) : '—'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </>
      )}
    </Stack>
  )
}
