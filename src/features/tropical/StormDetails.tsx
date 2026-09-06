import { Group, Loader, Stack, Text } from '@mantine/core'
import { useCachedFetch } from '@/core/data/useCachedFetch'
import { useTimeFormat } from '@/core/time/useTimeFormat'
import { useUnits } from '@/core/units/useUnitSystem'
import { fmtWind } from '@/core/units/format'
import { Sparkline } from '@/ui/Sparkline'
import { fetchDiscussion, productCode, type BestTrackPoint } from '@/features/tropical/atcf'
import { CATEGORY_COLORS, stormCategory, type ActiveStorm } from '@/features/tropical/service'

const KT_TO_MS = 0.514444

/** Vmax over the storm's life: peak, now, and the shape between. */
export function IntensityTrace({ history }: { history: BestTrackPoint[] | undefined }) {
  const fmt = useTimeFormat()
  const u = useUnits()
  if (!history || history.length === 0) return null
  const peak = history.reduce((a, p) => (p.vmax > a.vmax ? p : a), history[0])
  const last = history[history.length - 1]
  const peakCat = stormCategory(peak.ty, peak.vmax)
  return (
    <Group gap={8} wrap="nowrap">
      <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
        Intensity
      </Text>
      <Sparkline
        samples={history.map((p) => ({ x: p.t, y: p.vmax }))}
        width={72}
        height={14}
        color={CATEGORY_COLORS[peakCat.key]}
      />
      <Text size="xs" truncate>
        peak {fmtWind(peak.vmax * KT_TO_MS, u.wind)} {fmt.dateTime(peak.t)}
        {peak.t !== last.t && ` · now ${fmtWind(last.vmax * KT_TO_MS, u.wind)}`}
      </Text>
    </Group>
  )
}

/** The forecast discussion — the forecaster's own words, verbatim. */
export function Discussion({ storm }: { storm: ActiveStorm }) {
  const code = storm.discussionUrl ? productCode(storm.discussionUrl) : null
  const { data, loading, error } = useCachedFetch(
    code ? `nhc-discussion:${code}:${storm.advNum}` : null,
    10 * 60_000,
    () => fetchDiscussion(code as string),
  )
  if (!code) return null
  if (loading && !data) return <Loader size="xs" />
  if (error) {
    return (
      <Text size="xs" c="dimmed">
        Discussion unavailable ({error}).
      </Text>
    )
  }
  if (!data) return null
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed">
        Forecast discussion · NHC
      </Text>
      <Text size="xs" ff="monospace" style={{ whiteSpace: 'pre-wrap', maxHeight: 320, overflowY: 'auto' }}>
        {data.text}
      </Text>
    </Stack>
  )
}
