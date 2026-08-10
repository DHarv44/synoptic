import { useEffect, useMemo } from 'react'
import { GLOBE_RADIUS } from '@/scene/geo'
import { linesToSegmentPositions } from '@/scene/lineGeometry'
import { RENDER_ORDER } from '@/scene/renderOrder'
import { alertColor, withGeometry } from '@/features/alerts/service'
import { acquireAlertsFeed, useAlerts } from '@/features/alerts/store'

const LAYER_RADIUS = GLOBE_RADIUS * 1.0025

/** Warning polygons as colored outlines, batched into one geometry per color. */
export function AlertsLayer() {
  const alerts = useAlerts((s) => s.alerts)
  useEffect(() => acquireAlertsFeed(), [])

  const byColor = useMemo(() => {
    const groups = new Map<string, Array<Array<[number, number]>>>()
    for (const a of withGeometry(alerts)) {
      const color = alertColor(a.properties.event)
      const rings = (a.geometry?.coordinates ?? []).map(
        (ring) => ring.map(([lon, lat]) => [lon, lat] as [number, number]),
      )
      const list = groups.get(color) ?? []
      list.push(...rings)
      groups.set(color, list)
    }
    return [...groups.entries()].map(([color, rings]) => ({
      color,
      positions: linesToSegmentPositions(rings, LAYER_RADIUS),
    }))
  }, [alerts])

  return (
    <>
      {byColor.map(({ color, positions }) => (
        <lineSegments key={color} renderOrder={RENDER_ORDER.alerts}>
          <bufferGeometry key={positions.length}>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={color} />
        </lineSegments>
      ))}
    </>
  )
}
