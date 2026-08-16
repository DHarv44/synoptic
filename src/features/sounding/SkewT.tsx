import { useMemo } from 'react'
import type { Sounding } from '@/core/data/openMeteo/sounding'
import { liftParcel } from '@/core/met/thermo'
import { SoundingTrace } from '@/features/sounding/SoundingTrace'
import {
  DRY_ADIABATS_K,
  ISOBARS,
  ISOTHERMS,
  SKEWT,
  dryAdiabatPath,
  pathFrom,
  xOfTP,
  yOfP,
} from '@/features/sounding/skewTScales'

const COL = {
  grid: 'var(--mantine-color-default-border)',
  adiabat: 'var(--mantine-color-dimmed)',
  temp: 'var(--mantine-color-red-6)',
  dew: 'var(--mantine-color-teal-6)',
  parcel: 'var(--mantine-color-gray-5)',
  cape: 'var(--mantine-color-red-6)',
  text: 'var(--mantine-color-dimmed)',
}

interface SkewTProps {
  sounding: Sounding
  /** Observed balloon profile drawn dashed beneath the model traces. */
  observed?: Sounding | null
}

/** Skew-T log-p: environment traces, surface parcel path, CAPE shading. */
export function SkewT({ sounding, observed }: SkewTProps) {
  const { parcelPath, capePolygon } = useMemo(() => {
    const lv = sounding.levels
    const ps = lv.map((l) => l.p)
    const parcel = liftParcel(lv[0].T, lv[0].Td, lv[0].p, ps)

    const tPts = lv.map((l) => [xOfTP(l.T, l.p), yOfP(l.p)] as [number, number])
    const pPts = lv.map(
      (l, i) => [xOfTP(parcel.temps[i], l.p), yOfP(l.p)] as [number, number],
    )

    // CAPE region: where parcel warmer than environment
    const up: Array<[number, number]> = []
    const down: Array<[number, number]> = []
    for (let i = 0; i < lv.length; i++) {
      if (parcel.temps[i] > lv[i].T) {
        up.push(pPts[i])
        down.unshift(tPts[i])
      }
    }
    return {
      parcelPath: pathFrom(pPts),
      capePolygon: up.length > 1 ? pathFrom([...up, ...down]) + 'Z' : null,
    }
  }, [sounding])

  return (
    <svg viewBox={`0 0 ${SKEWT.W} ${SKEWT.H}`} width="100%" style={{ display: 'block' }}>
      <clipPath id="skewt-clip">
        <rect
          x={SKEWT.ML}
          y={SKEWT.MT}
          width={SKEWT.W - SKEWT.ML - SKEWT.MR}
          height={SKEWT.H - SKEWT.MT - SKEWT.MB}
        />
      </clipPath>
      {/* isobars */}
      {ISOBARS.map((p) => (
        <g key={p}>
          <line
            x1={SKEWT.ML}
            x2={SKEWT.W - SKEWT.MR}
            y1={yOfP(p)}
            y2={yOfP(p)}
            stroke={COL.grid}
            strokeWidth={0.5}
          />
          <text x={SKEWT.ML - 3} y={yOfP(p) + 3} fontSize={8} fill={COL.text} textAnchor="end">
            {p}
          </text>
        </g>
      ))}
      <g clipPath="url(#skewt-clip)">
        {/* skewed isotherms */}
        {ISOTHERMS.map((t) => (
          <line
            key={t}
            x1={xOfTP(t, SKEWT.P_BOT)}
            y1={yOfP(SKEWT.P_BOT)}
            x2={xOfTP(t, SKEWT.P_TOP)}
            y2={yOfP(SKEWT.P_TOP)}
            stroke={COL.grid}
            strokeWidth={t === 0 ? 1 : 0.5}
          />
        ))}
        {/* dry adiabats */}
        {DRY_ADIABATS_K.map((th) => (
          <path
            key={th}
            d={pathFrom(dryAdiabatPath(th))}
            fill="none"
            stroke={COL.adiabat}
            strokeWidth={0.4}
            opacity={0.5}
          />
        ))}
        {capePolygon && <path d={capePolygon} fill={COL.cape} opacity={0.15} />}
        <path d={parcelPath} fill="none" stroke={COL.parcel} strokeWidth={1.2} strokeDasharray="4 3" />
        {observed && (
          <g opacity={0.65}>
            <SoundingTrace sounding={observed} tempColor={COL.temp} dewColor={COL.dew} dash="5 3" width={1.3} />
          </g>
        )}
        <SoundingTrace sounding={sounding} tempColor={COL.temp} dewColor={COL.dew} />
      </g>
      {/* bottom temperature labels */}
      {ISOTHERMS.filter((t) => t >= SKEWT.T_MIN && t <= SKEWT.T_MAX).map((t) => (
        <text
          key={t}
          x={xOfTP(t, SKEWT.P_BOT)}
          y={SKEWT.H - 8}
          fontSize={8}
          fill={COL.text}
          textAnchor="middle"
        >
          {t}°
        </text>
      ))}
    </svg>
  )
}
