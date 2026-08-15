import { useMemo } from 'react'
import { scaleLinear, scaleTime } from 'd3-scale'
import { line } from 'd3-shape'
import { useTimeline } from '@/core/time/timelineStore'
import { DayTicks, NowCursor, YGrid } from '@/ui/chart/frame'
import {
  MODELS,
  ensembleMembers,
  modelSeries,
  type HourlyByModel,
} from '@/core/data/openMeteo/models'

const W = 320
const H = 200
const ML = 30
const MR = 8
const MT = 8
const MB = 18

interface ModelsChartProps {
  data: HourlyByModel
  ensemble: HourlyByModel | null
  varKey: string
}

/** Multi-model spaghetti (+ optional GFS ensemble members underlay). */
export function ModelsChart({ data, ensemble, varKey }: ModelsChartProps) {
  const simTime = useTimeline((s) => s.simTime)

  const chart = useMemo(() => {
    const times = data.hourly.time.map((t) => Date.parse(t + 'Z'))
    const perModel = MODELS.map((m) => ({ m, vals: modelSeries(data, varKey, m.key) })).filter(
      (e): e is { m: (typeof MODELS)[number]; vals: Array<number | null> } => e.vals !== null,
    )
    const members = ensemble && varKey === 'temperature_2m' ? ensembleMembers(ensemble, varKey) : []
    const ensTimes = ensemble ? ensemble.hourly.time.map((t) => Date.parse(t + 'Z')) : []

    const all = [
      ...perModel.flatMap((e) => e.vals),
      ...members.flat(),
    ].filter((v): v is number => v !== null && Number.isFinite(v))
    if (all.length === 0) return null
    const x = scaleTime().domain([times[0], times[times.length - 1]]).range([ML, W - MR])
    const y = scaleLinear()
      .domain([Math.min(...all), Math.max(...all)])
      .nice()
      .range([H - MB, MT])

    const mkPath = (ts: number[], vals: Array<number | null>): string =>
      line<number>()
        .defined((i) => vals[i] !== null && Number.isFinite(vals[i] as number))
        .x((i) => x(ts[i]))
        .y((i) => y(vals[i] as number))(vals.map((_, i) => i)) ?? ''

    const dayTicks: number[] = []
    for (const t of times) if (new Date(t).getUTCHours() === 0) dayTicks.push(t)

    return {
      x,
      yTicks: y.ticks(4).map((v) => ({ v, y: y(v) })),
      dayTicks: dayTicks.map((t) => ({ t, x: x(t) })),
      modelPaths: perModel.map((e) => ({ color: e.m.color, d: mkPath(times, e.vals) })),
      memberPaths: members.map((vals) => mkPath(ensTimes, vals)),
    }
  }, [data, ensemble, varKey])

  if (!chart) return null
  const nowX = chart.x(simTime)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <YGrid ticks={chart.yTicks} x1={ML} x2={W - MR} />
      <DayTicks ticks={chart.dayTicks} y1={MT} y2={H - MB} labelY={H - 6} />
      {chart.memberPaths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="var(--mantine-color-gray-6)" strokeWidth={0.5} opacity={0.35} />
      ))}
      {chart.modelPaths.map(({ color, d }, i) => (
        <path key={i} d={d} fill="none" stroke={color} strokeWidth={1.4} />
      ))}
      <NowCursor x={nowX} xMin={ML} xMax={W - MR} y1={MT} y2={H - MB} />
    </svg>
  )
}
