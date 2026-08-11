import { SectionHint } from '@/ui/SectionHint'
import { useRadar } from '@/features/radar/level2/store'
import { tiltsFor } from '@/features/radar/level2/controls'

/** Which radar, which cut, which product — the state you'd otherwise expand to check. */
export function RadarSummary() {
  const site = useRadar((s) => s.site)
  const tilts = useRadar((s) => s.tilts)
  const elevNum = useRadar((s) => s.elevNum)
  const moment = useRadar((s) => s.moment)

  if (!site) return <SectionHint>no site</SectionHint>
  const current = tiltsFor(tilts, moment).find((t) => t.num === elevNum)
  return (
    <SectionHint>
      {site.id}
      {current && ` · ${current.deg.toFixed(1)}°`} · {moment}
    </SectionHint>
  )
}
