import { memo, useCallback, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { TilePatch } from '@/scene/tiles/TilePatch'
import { vec3ToLatLon } from '@/scene/geo'
import { computeVisibleTiles } from '@/scene/tiles/selection'
import { tileKey, type TileCoord } from '@/scene/tiles/mercator'
import { reportError } from '@/core/data/healthStore'
import type { SourceRef } from '@/core/data/types'

const RECOMPUTE_INTERVAL_S = 0.4
const ERROR_REPORT_THROTTLE_MS = 30_000

interface TileLayerProps {
  urlFor: (z: number, x: number, y: number) => string
  radius: number
  opacity: number
  renderOrder: number
  source: SourceRef
}

/**
 * Generic slippy-tile drape: tracks the camera, maintains the visible tile
 * set (throttled), renders one TilePatch per tile. Tile URLs may change
 * between frames (animated layers) — patches swap textures on load.
 */
export function TileLayer({ urlFor, radius, opacity, renderOrder, source }: TileLayerProps) {
  const camera = useThree((s) => s.camera)
  const [tiles, setTiles] = useState<TileCoord[]>([])
  const keysRef = useRef('')
  const clockRef = useRef(0)
  const lastErrorRef = useRef(0)

  useFrame((_, delta) => {
    clockRef.current += delta
    if (clockRef.current < RECOMPUTE_INTERVAL_S) return
    clockRef.current = 0
    const { lat, lon } = vec3ToLatLon(camera.position)
    const next = computeVisibleTiles(lat, lon, camera.position.length())
    const keys = next.map(tileKey).join('|')
    if (keys !== keysRef.current) {
      keysRef.current = keys
      setTiles(next)
    }
  })

  const handleError = useCallback(() => {
    const now = Date.now()
    if (now - lastErrorRef.current > ERROR_REPORT_THROTTLE_MS) {
      lastErrorRef.current = now
      reportError(source, 'tile fetch failed')
    }
  }, [source])

  return (
    <>
      {tiles.map((t) => (
        <TilePatchMemo
          key={tileKey(t)}
          coord={t}
          url={urlFor(t.z, t.x, t.y)}
          radius={radius}
          opacity={opacity}
          renderOrder={renderOrder}
          onError={handleError}
        />
      ))}
    </>
  )
}

const TilePatchMemo = memo(TilePatch)
