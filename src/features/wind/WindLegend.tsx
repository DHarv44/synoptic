import { Paper, Text } from '@mantine/core'
import { gfsRunLabel, useGfsRun } from '@/core/data/gfsRun'
import { useFeatureOption } from '@/core/settings/store'
import { useUnits } from '@/core/units/useUnitSystem'
import { windUnitInfo } from '@/core/units/format'
import { RAMP_MAX_MS, windRampCss } from '@/features/wind/ramp'
import { mapChromeStyle } from '@/ui/mapChrome'

const BAR_W = 200

/** Tick spacing per display unit — round numbers in the unit the user reads. */
const TICK_STEP: Record<string, number> = { 'm/s': 10, 'km/h': 40, mph: 25, kt: 20 }

const LEVEL_LABEL: Record<string, string> = {
  '10m': '10 m wind',
  '850': '850 hPa wind',
  '700': '700 hPa wind',
  '500': '500 hPa wind',
  '250': '250 hPa wind',
}

/**
 * Colour key for the speed wash: the ramp as a gradient with ticks in the
 * user's wind unit. Hidden when the wash is off — particles alone carry no
 * colour story to key.
 */
export function WindLegend() {
  const showField = useFeatureOption<boolean>('wind', 'field')
  const level = useFeatureOption<string>('wind', 'level')
  const unit = useUnits().wind
  const info = useGfsRun((s) => s.byProduct['wind'])
  if (!showField) return null

  const { factor, label } = windUnitInfo(unit)
  const step = TICK_STEP[label] ?? 10
  const maxDisplay = RAMP_MAX_MS * factor
  const ticks: number[] = []
  for (let t = 0; t <= maxDisplay; t += step) ticks.push(t)

  return (
    <Paper
      withBorder
      radius="sm"
      px={8}
      py={5}
      style={{ ...mapChromeStyle, width: BAR_W + 16, pointerEvents: 'auto' }}
    >
      <Text size="xs" c="dimmed" lh={1.2}>
        {LEVEL_LABEL[level] ?? 'Wind'} · {label} · {gfsRunLabel(info)}
      </Text>
      <div
        style={{
          marginTop: 4,
          width: BAR_W,
          height: 8,
          borderRadius: 2,
          background: windRampCss(),
        }}
      />
      <div style={{ position: 'relative', width: BAR_W, height: 12 }}>
        {ticks.map((t) => (
          <Text
            key={t}
            size="xs"
            ff="monospace"
            lh={1}
            style={{
              position: 'absolute',
              left: `${(t / maxDisplay) * 100}%`,
              transform: 'translateX(-50%)',
              fontSize: 10,
              top: 2,
            }}
          >
            {t}
          </Text>
        ))}
      </div>
    </Paper>
  )
}
