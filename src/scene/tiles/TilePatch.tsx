import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferGeometry,
  Float32BufferAttribute,
  MeshBasicMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from 'three'
import { latLonToVec3 } from '@/scene/geo'
import { tileFracToLonLat, type TileCoord } from '@/scene/tiles/mercator'

const GRID = 8
const loader = new TextureLoader()
loader.setCrossOrigin('anonymous')

/** Curved sphere patch for one slippy tile; linear-in-mercator so UVs map 1:1. */
function buildGeometry(coord: TileCoord, radius: number): BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  for (let j = 0; j <= GRID; j++) {
    for (let i = 0; i <= GRID; i++) {
      const { lon, lat } = tileFracToLonLat(coord.z, coord.x + i / GRID, coord.y + j / GRID)
      const v = latLonToVec3(lat, lon, radius)
      positions.push(v.x, v.y, v.z)
      uvs.push(i / GRID, 1 - j / GRID)
    }
  }
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const a = j * (GRID + 1) + i
      const b = a + 1
      const c = a + GRID + 1
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  return geo
}

interface TilePatchProps {
  coord: TileCoord
  url: string
  radius: number
  opacity: number
  renderOrder: number
  onError?: () => void
}

/** One textured tile patch; keeps the previous texture until the next URL loads. */
export function TilePatch({ coord, url, radius, opacity, renderOrder, onError }: TilePatchProps) {
  const [texture, setTexture] = useState<Texture | null>(null)
  const matRef = useRef<MeshBasicMaterial>(null)

  const geometry = useMemo(() => buildGeometry(coord, radius), [coord, radius])
  useEffect(() => () => geometry.dispose(), [geometry])

  useEffect(() => {
    let cancelled = false
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = SRGBColorSpace
        if (cancelled) {
          tex.dispose()
          return
        }
        setTexture((prev) => {
          prev?.dispose()
          return tex
        })
      },
      undefined,
      () => {
        if (!cancelled) onError?.()
      },
    )
    return () => {
      cancelled = true
    }
  }, [url, onError])

  useEffect(() => () => texture?.dispose(), [texture])

  // Fade toward target opacity once a texture exists.
  useFrame(() => {
    const mat = matRef.current
    if (!mat) return
    const target = texture ? opacity : 0
    mat.opacity += (target - mat.opacity) * 0.18
  })

  if (!texture) return null

  return (
    <mesh geometry={geometry} renderOrder={renderOrder}>
      <meshBasicMaterial
        ref={matRef}
        map={texture}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  )
}
