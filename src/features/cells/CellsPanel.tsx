import { useEffect, useMemo } from 'react'
import { Badge, Stack, Table, Text } from '@mantine/core'
import { useCameraStore } from '@/map/cameraStore'
import { bboxIntersects, useMapView } from '@/map/viewStore'
import { cellSeverity, SEVERITY_COLORS, type CellFeature } from '@/features/cells/service'
import { acquireCellsFeed, useCellsData } from '@/features/cells/store'

const MAX_ROWS = 30

function severityBadge(c: CellFeature): string | null {
  if (c.properties.tvs !== 'NONE') return 'TVS'
  if (c.properties.meso !== 'NONE') return `MESO ${c.properties.meso}`
  return null
}

/** Storm cell table (viewport-filtered): click a row to fly to the cell. */
export function CellsPanel() {
  const cells = useCellsData()
  const bounds = useMapView((s) => s.bounds)
  const requestFlyTo = useCameraStore((s) => s.requestFlyTo)
  useEffect(() => acquireCellsFeed(), [])

  const visible = useMemo(() => {
    if (!bounds) return cells
    return cells.filter((c) => {
      const [lon, lat] = c.geometry.coordinates
      return bboxIntersects([lon, lat, lon, lat], bounds)
    })
  }, [cells, bounds])

  if (cells.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        No storm cells reported (or feed loading).
      </Text>
    )
  }

  return (
    <Stack gap={6}>
      <Text size="xs" c="dimmed">
        {visible.length} cells in view · NEXRAD storm attributes via IEM
      </Text>
      <Table withRowBorders={false} verticalSpacing={2} fz="xs" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Cell</Table.Th>
            <Table.Th ta="right">dBZ</Table.Th>
            <Table.Th ta="right">Top kft</Table.Th>
            <Table.Th ta="right">Hail″</Table.Th>
            <Table.Th>Flags</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {visible.slice(0, MAX_ROWS).map((c) => {
            const p = c.properties
            const badge = severityBadge(c)
            return (
              <Table.Tr
                key={`${p.nexrad}-${p.storm_id}`}
                style={{ cursor: 'pointer' }}
                onClick={() => requestFlyTo(c.geometry.coordinates[1], c.geometry.coordinates[0])}
              >
                <Table.Td ff="monospace">
                  <span style={{ color: SEVERITY_COLORS[cellSeverity(p)] }}>●</span> {p.nexrad}{' '}
                  {p.storm_id}
                </Table.Td>
                <Table.Td ta="right" ff="monospace">
                  {p.max_dbz}
                </Table.Td>
                <Table.Td ta="right" ff="monospace">
                  {p.top.toFixed(0)}
                </Table.Td>
                <Table.Td ta="right" ff="monospace">
                  {p.max_size > 0 ? p.max_size.toFixed(2) : '—'}
                </Table.Td>
                <Table.Td>
                  {badge && (
                    <Badge size="xs" color={p.tvs !== 'NONE' ? 'red' : 'orange'} variant="light">
                      {badge}
                    </Badge>
                  )}
                </Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>
    </Stack>
  )
}
