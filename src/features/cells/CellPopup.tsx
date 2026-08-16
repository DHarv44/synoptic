import { Badge, Group, Stack, Table, Text } from '@mantine/core'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import { useUnits } from '@/core/units/useUnitSystem'
import { fmtWind, fmtWindDir } from '@/core/units/format'
import type { MapPopupProps } from '@/map/popups/registry'

const KT_TO_MS = 0.514444
const num = (v: unknown): number => (typeof v === 'number' ? v : 0)

/** One storm cell's attribute row, at the cell. */
export function CellPopup({ properties }: MapPopupProps) {
  const u = useUnits()
  const fmt = useTimeFormat()
  const tvs = String(properties.tvs ?? 'NONE')
  const meso = String(properties.meso ?? 'NONE')
  const maxSize = num(properties.max_size)
  const posh = num(properties.posh)
  const validMs = Date.parse(String(properties.valid ?? ''))

  const rows: Array<[string, string]> = [
    ['Max dBZ', `${num(properties.max_dbz)}`],
    ['Top', `${num(properties.top)} kft`],
    ['Motion', `${fmtWindDir(num(properties.drct))} ${fmtWind(num(properties.sknt) * KT_TO_MS, u.wind)}`],
  ]
  if (maxSize > 0 || posh > 0) rows.push(['Hail', `${maxSize}" · POSH ${posh}%`])

  return (
    <Stack gap={4}>
      <Group gap={6} wrap="nowrap">
        <Text size="sm" fw={600}>
          Cell {String(properties.storm_id ?? '')}
        </Text>
        {tvs !== 'NONE' && (
          <Badge size="xs" color="red">
            TVS
          </Badge>
        )}
        {meso !== 'NONE' && (
          <Badge size="xs" color="orange">
            MESO {meso}
          </Badge>
        )}
      </Group>
      <Text size="xs" c="dimmed">
        {String(properties.nexrad ?? '')}
        {Number.isFinite(validMs) && ` · ${fmt.hm(validMs)}`}
      </Text>
      <Table withRowBorders={false} verticalSpacing={1} fz="xs" data={{ body: rows }} />
    </Stack>
  )
}
