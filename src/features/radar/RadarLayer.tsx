import { useFeatureOption } from '@/core/settings/store'
import { MosaicLayer } from '@/features/radar/MosaicLayer'
import { GlobalLayer } from '@/features/radar/GlobalLayer'

/**
 * Exactly one composite, chosen explicitly.
 *
 * These are different products, built by different organisations, with
 * different colour tables and different valid times. Drawing both means the
 * picture is a blend of the two — and because "no echo" is transparent in
 * both, the blend rearranges itself whenever either one's coverage changes.
 * Deciding automatically was worse still: keying the choice on the viewport
 * made it flip while panning and zooming, which is exactly what a radar
 * display must never do. So it is a setting, and it is the user's.
 */
export function RadarLayer() {
  const source = useFeatureOption<string>('radar', 'source')
  return source === 'global' ? <GlobalLayer /> : <MosaicLayer />
}
