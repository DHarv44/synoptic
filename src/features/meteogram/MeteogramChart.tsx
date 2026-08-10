import { useMemo } from 'react'
import { scaleLinear, scaleTime } from 'd3-scale'
import { line } from 'd3-shape'
import type { MeteogramSeries } from '@/features/meteogram/series'
import { WindBarb } from '@/features/meteogram/WindBarb'
import type { TempUnit } from '@/core/units/useUnitSystem'
import { useTimeline } from '@/core/time/timelineStore'

const W = 320
const H = 300
const ML = 30
const MR = 8
const TEMP_TOP = 8
const TEMP_BOT = 126
const CLOUD_TOP = 132
const CLOUD_BOT = 148
const WIND_Y = 168
const PRECIP_TOP = 188
const PRECIP_BOT = 266
const AXIS_Y = 280

const COL = {
  temp: 'var(--mantine-color-red-6)',
  dew: 'var(--mantine-color-teal-6)',
  precip: 'var(--mantine-color-blue-6)',
  prob: 'var(--mantine-color-blue-4)',
  cloud: 'var(--mantine-color-gray-6)',
  grid: 'var(--mantine-color-default-border)',
  text: 'var(--mantine-color-dimmed)',
  now: 'var(--mantine-color-orange-6)',
  wind: 'var(--mantine-color-gray-5)',
}

function toDisplay(c: number, unit: TempUnit): number {
  return unit === 'F' ? (c * 9) / 5 + 32 : c
}

interface MeteogramChartProps {
  series: MeteogramSeries
  tempUnit: TempUnit
}

/** 7-day meteogram: temp/dewpoint, cloud strip, wind barbs, precip + probability. */
export function MeteogramChart({ series, tempUnit }: MeteogramChartProps) {
  const simTime = useTimeline((s) => s.simTime)

  const { x, yT, yP, tempPath, dewPath, probPath, tempTicks, dayTicks } = useMemo(() => {
    const x = scaleTime()
      .domain([series.times[0], series.times[series.times.length - 1]])
      .range([ML, W - MR])
    const tempsDisp = series.temp.map((v) => toDisplay(v, tempUnit))
    const dewsDisp = series.dewpoint.map((v) => toDisplay(v, tempUnit))
    const tMin = Math.min(...tempsDisp, ...dewsDisp)
    const tMax = Math.max(...tempsDisp, ...dewsDisp)
    const yT = scaleLinear().domain([tMin - 2, tMax + 2]).range([TEMP_BOT, TEMP_TOP]).nice()
    const yP = scaleLinear()
      .domain([0, Math.max(1, ...series.precip)])
      .range([PRECIP_BOT, PRECIP_TOP])
    const yProb = scaleLinear().domain([0, 100]).range([PRECIP_BOT, PRECIP_TOP])

    const mkLine = (vals: number[], y: (v: number) => number) =>
      line<number>()
        .x((_, i) => x(series.times[i]))
        .y((_, i) => y(vals[i]))(vals.map((_, i) => i)) ?? ''

    const dayTicks: number[] = []
    for (const t of series.times) {
      if (new Date(t).getUTCHours() === 0) dayTicks.push(t)
    }
    return {
      x,
      yT,
      yP,
      yProb,
      tempPath: mkLine(tempsDisp, (v) => yT(v)),
      dewPath: mkLine(dewsDisp, (v) => yT(v)),
      probPath: mkLine(series.precipProb, (v) => yProb(v)),
      tempTicks: yT.ticks(4),
      dayTicks,
    }
  }, [series, tempUnit])

  const barWidth = (W - ML - MR) / series.times.length
  const nowX = x(simTime)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {/* temp gridlines + ticks */}
      {tempTicks.map((t) => (
        <g key={t}>
          <line x1={ML} x2={W - MR} y1={yT(t)} y2={yT(t)} stroke={COL.grid} strokeWidth={0.5} />
          <text x={ML - 4} y={yT(t) + 3} fontSize={8} fill={COL.text} textAnchor="end">
            {t}°
          </text>
        </g>
      ))}
      {/* day boundaries */}
      {dayTicks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={TEMP_TOP} y2={PRECIP_BOT} stroke={COL.grid} strokeWidth={0.5} />
          <text x={x(t) + 2} y={AXIS_Y} fontSize={8} fill={COL.text}>
            {new Date(t).toISOString().slice(5, 10)}
          </text>
        </g>
      ))}
      {/* cloud cover strip */}
      {series.cloud.map((c, i) => (
        <rect
          key={i}
          x={x(series.times[i]) - barWidth / 2}
          y={CLOUD_TOP}
          width={barWidth + 0.5}
          height={CLOUD_BOT - CLOUD_TOP}
          fill={COL.cloud}
          opacity={(c / 100) * 0.85}
        />
      ))}
      {/* precip bars + probability */}
      {series.precip.map((p, i) =>
        p > 0 ? (
          <rect
            key={i}
            x={x(series.times[i]) - barWidth / 2}
            y={yP(p)}
            width={barWidth + 0.3}
            height={PRECIP_BOT - yP(p)}
            fill={COL.precip}
            opacity={0.9}
          />
        ) : null,
      )}
      <path d={probPath} fill="none" stroke={COL.prob} strokeWidth={1} strokeDasharray="3 2" />
      {/* temp + dew */}
      <path d={tempPath} fill="none" stroke={COL.temp} strokeWidth={1.5} />
      <path d={dewPath} fill="none" stroke={COL.dew} strokeWidth={1.5} />
      {/* wind barbs every 6h */}
      {series.times.map((t, i) =>
        i % 6 === 0 ? (
          <WindBarb
            key={t}
            x={x(t)}
            y={WIND_Y}
            dirDeg={series.windDir[i]}
            speedMs={series.windSpeed[i]}
            color={COL.wind}
          />
        ) : null,
      )}
      {/* now cursor */}
      {nowX >= ML && nowX <= W - MR && (
        <line x1={nowX} x2={nowX} y1={TEMP_TOP} y2={PRECIP_BOT} stroke={COL.now} strokeWidth={1} />
      )}
    </svg>
  )
}
