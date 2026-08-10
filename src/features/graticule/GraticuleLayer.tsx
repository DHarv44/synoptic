import { useMemo } from 'react'
import { GLOBE_RADIUS } from '@/scene/geo'
import { graticuleSegmentPositions } from '@/scene/lineGeometry'
import { useFeatureOption } from '@/core/settings/store'
import { useSceneColors } from '@/scene/colors'

const LINE_RADIUS = GLOBE_RADIUS * 1.0005

/** Lat/lon grid on the globe; spacing comes from feature settings. */
export function GraticuleLayer() {
  const spacing = Number(useFeatureOption<string>('graticule', 'spacing'))
  const colors = useSceneColors()
  const positions = useMemo(
    () => graticuleSegmentPositions(spacing, LINE_RADIUS),
    [spacing],
  )

  return (
    <lineSegments>
      <bufferGeometry key={spacing}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={colors.graticule} transparent opacity={0.35} />
    </lineSegments>
  )
}
