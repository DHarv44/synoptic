import { Badge, Group, Stack, Table, Text } from '@mantine/core'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import { useUnits } from '@/core/units/useUnitSystem'
import { fmtTemp, fmtWind, fmtWindDir } from '@/core/units/format'
import type { MapPopupProps } from '@/map/popups/registry'

const KT_TO_MS = 0.514444
const FLTCAT_COLOR: Record<string, string> = {
  VFR: 'green',
  MVFR: 'blue',
  IFR: 'red',
  LIFR: 'grape',
}

const num = (v: unknown): number | null => (typeof v === 'number' ? v : null)

/** Everything the station plot compresses, plus the raw METAR. */
export function MetarPopup({ properties }: MapPopupProps) {
  const u = useUnits()
  const fmt = useTimeFormat()
  const fltCat = typeof properties.fltCat === 'string' ? properties.fltCat : null
  const obsTime = num(properties.obsTime)
  const temp = num(properties.temp)
  const dewp = num(properties.dewp)
  const wdir = num(properties.wdir)
  const wspd = num(properties.wspd)

  const rows: Array<[string, string]> = []
  if (temp !== null) rows.push(['Temp', fmtTemp(temp, u.temp)])
  if (dewp !== null) rows.push(['Dewpoint', fmtTemp(dewp, u.temp)])
  if (wspd !== null) {
    rows.push([
      'Wind',
      `${wdir !== null ? `${fmtWindDir(wdir)} ` : ''}${fmtWind(wspd * KT_TO_MS, u.wind)}`,
    ])
  }

  return (
    <Stack gap={4}>
      <Group gap={6} wrap="nowrap">
        <Text size="sm" fw={600}>
          {String(properties.icaoId ?? '')}
        </Text>
        {fltCat !== null && (
          <Badge size="xs" color={FLTCAT_COLOR[fltCat] ?? 'gray'}>
            {fltCat}
          </Badge>
        )}
      </Group>
      <Text size="xs" c="dimmed" lineClamp={1}>
        {String(properties.name ?? '')}
        {obsTime !== null && ` · ${fmt.hm(obsTime * 1000)}`}
      </Text>
      <Table withRowBorders={false} verticalSpacing={1} fz="xs" data={{ body: rows }} />
      <Text size="xs" ff="monospace" c="dimmed" style={{ wordBreak: 'break-word' }}>
        {String(properties.rawOb ?? '')}
      </Text>
    </Stack>
  )
}
