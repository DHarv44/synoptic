import { Badge, Group, Stack, Table, Text } from '@mantine/core'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import { useUnits } from '@/core/units/useUnitSystem'
import { fmtPressure, fmtTemp, fmtWind, fmtWindDir } from '@/core/units/format'
import { OBS_KIND_LABEL, type ObsTier } from '@/features/metar/service'
import type { MapPopupProps } from '@/map/popups/registry'

const KT_TO_MS = 0.514444
const FLTCAT_COLOR: Record<string, string> = {
  VFR: 'green',
  MVFR: 'blue',
  IFR: 'red',
  LIFR: 'grape',
}

const num = (v: unknown): number | null => (typeof v === 'number' ? v : null)
const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null)

/** Everything the station plot compresses, plus the raw METAR when there is one. */
export function MetarPopup({ properties }: MapPopupProps) {
  const u = useUnits()
  const fmt = useTimeFormat()
  const fltCat = str(properties.fltCat)
  const kind = str(properties.kind)
  const tier = kind !== null && kind in OBS_KIND_LABEL ? (kind as ObsTier) : null
  const obsTime = num(properties.obsTime)
  const temp = num(properties.temp)
  const dewp = num(properties.dewp)
  const wdir = num(properties.wdir)
  const wspd = num(properties.wspd)
  const gust = num(properties.gust)
  const mslp = num(properties.mslp)
  const wx = str(properties.wx)
  const sky = str(properties.sky)
  const network = str(properties.network)
  const rawOb = str(properties.rawOb)

  const rows: Array<[string, string]> = []
  if (temp !== null) rows.push(['Temp', fmtTemp(temp, u.temp)])
  if (dewp !== null) rows.push(['Dewpoint', fmtTemp(dewp, u.temp)])
  if (wspd !== null) {
    const dir = wdir !== null ? `${fmtWindDir(wdir)} ` : ''
    const g = gust !== null && gust > wspd ? ` gusting ${fmtWind(gust * KT_TO_MS, u.wind)}` : ''
    rows.push(['Wind', `${dir}${fmtWind(wspd * KT_TO_MS, u.wind)}${g}`])
  }
  if (mslp !== null) rows.push(['Pressure', fmtPressure(mslp, u.pressure)])
  if (wx !== null) rows.push(['Weather', wx])
  if (sky !== null) rows.push(['Sky', sky])

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
        {tier !== null && (
          <Badge size="xs" color="gray" variant="light">
            {OBS_KIND_LABEL[tier]}
          </Badge>
        )}
      </Group>
      <Text size="xs" c="dimmed" lineClamp={1}>
        {String(properties.name ?? '')}
        {network !== null && tier !== null && ` · ${network}`}
        {obsTime !== null && ` · ${fmt.hm(obsTime * 1000)}`}
      </Text>
      <Table withRowBorders={false} verticalSpacing={1} fz="xs" data={{ body: rows }} />
      {rawOb !== null && (
        <Text size="xs" ff="monospace" c="dimmed" style={{ wordBreak: 'break-word' }}>
          {rawOb}
        </Text>
      )}
    </Stack>
  )
}
