import { useMemo } from 'react'
import type { Sounding } from '@/core/data/openMeteo/sounding'
import { pathFrom, xOfTP, yOfP } from '@/features/sounding/skewTScales'

interface Props {
  sounding: Sounding
  tempColor: string
  dewColor: string
  /** SVG dasharray; omit for solid. */
  dash?: string
  width?: number
}

/** Temperature and dewpoint curves for one sounding, on the shared skew-T scales. */
export function SoundingTrace({ sounding, tempColor, dewColor, dash, width = 1.8 }: Props) {
  const { tempPath, dewPath } = useMemo(() => {
    const t = sounding.levels.map((l) => [xOfTP(l.T, l.p), yOfP(l.p)] as [number, number])
    const d = sounding.levels.map((l) => [xOfTP(l.Td, l.p), yOfP(l.p)] as [number, number])
    return { tempPath: pathFrom(t), dewPath: pathFrom(d) }
  }, [sounding])

  return (
    <>
      <path d={tempPath} fill="none" stroke={tempColor} strokeWidth={width} strokeDasharray={dash} />
      <path d={dewPath} fill="none" stroke={dewColor} strokeWidth={width} strokeDasharray={dash} />
    </>
  )
}
