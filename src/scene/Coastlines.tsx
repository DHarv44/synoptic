import { useMemo } from 'react'
import * as topojson from 'topojson-client'
import land110m from 'world-atlas/land-110m.json'
import { GLOBE_RADIUS } from '@/scene/geo'
import { linesToSegmentPositions } from '@/scene/lineGeometry'
import { RENDER_ORDER } from '@/scene/renderOrder'

const LINE_RADIUS = GLOBE_RADIUS * 1.001

type MeshInput = Parameters<typeof topojson.mesh>[0]
type MeshObject = Parameters<typeof topojson.mesh>[1]

interface CoastlinesProps {
  color: string
}

/** Natural Earth 1:110m coastlines (bundled via the world-atlas package). */
export function Coastlines({ color }: CoastlinesProps) {
  const positions = useMemo(() => {
    const topo = land110m as unknown as MeshInput
    const lines = topojson.mesh(topo, topo.objects.land as MeshObject)
    return linesToSegmentPositions(lines.coordinates as never, LINE_RADIUS)
  }, [])

  return (
    <lineSegments renderOrder={RENDER_ORDER.coastlines}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={color} />
    </lineSegments>
  )
}
