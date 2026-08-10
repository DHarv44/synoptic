import { useMemo } from 'react'
import { GLOBE_RADIUS, latLonToVec3 } from '@/scene/geo'
import { useProbe } from '@/core/probe/store'

interface ProbeMarkerProps {
  color: string
}

/** Small marker at the probed location. */
export function ProbeMarker({ color }: ProbeMarkerProps) {
  const point = useProbe((s) => s.point)
  const position = useMemo(
    () => (point ? latLonToVec3(point.lat, point.lon, GLOBE_RADIUS * 1.005) : null),
    [point],
  )
  if (!position) return null

  return (
    <mesh position={position}>
      <sphereGeometry args={[0.008, 16, 16]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}
