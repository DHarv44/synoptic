import { SectionHint } from '@/ui/SectionHint'
import { useSounding } from '@/features/sounding/useSounding'
import { deriveIndices, MS_TO_KT } from '@/features/sounding/indices'

/**
 * CAPE and deep-layer shear: the two numbers that decide whether the rest of
 * the profile is worth opening.
 */
export function SoundingSummary() {
  const { sounding } = useSounding()
  if (!sounding) return null
  const ix = deriveIndices(sounding)
  return (
    <SectionHint>
      CAPE {Math.round(ix.cape)} · shear {Math.round(ix.shear6 * MS_TO_KT)} kt
    </SectionHint>
  )
}
