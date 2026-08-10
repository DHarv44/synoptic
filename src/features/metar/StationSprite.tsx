import { useEffect, useMemo } from 'react'
import type { Vector3 } from 'three'
import { makeStationTexture } from '@/features/metar/drawStationModel'
import type { Metar } from '@/features/metar/service'

const SPRITE_SCALE = 0.055

const COLORS = {
  dark: { temp: '#ff8787', dewp: '#63e6be', station: '#ced4da' },
  light: { temp: '#c92a2a', dewp: '#087f5b', station: '#343a40' },
}

interface StationSpriteProps {
  metar: Metar
  position: Vector3
  scheme: 'dark' | 'light'
  renderOrder: number
}

/** One station-model billboard. */
export function StationSprite({ metar, position, scheme, renderOrder }: StationSpriteProps) {
  const texture = useMemo(
    () => makeStationTexture(metar, COLORS[scheme]),
    [metar, scheme],
  )
  useEffect(() => () => texture.dispose(), [texture])

  return (
    <sprite position={position} scale={SPRITE_SCALE} renderOrder={renderOrder}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  )
}
