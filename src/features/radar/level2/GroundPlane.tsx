import { useEffect, useMemo, useState } from 'react'
import { useComputedColorScheme } from '@mantine/core'
import { BufferAttribute, BufferGeometry, CanvasTexture, SRGBColorSpace } from 'three'
import { useRadar } from '@/features/radar/level2/store'
import { renderGroundImage, type GroundImage } from '@/features/radar/level2/groundTexture'

const RING_KM = [50, 100, 150]
const RING_SEGMENTS = 128

/** Range rings at the radar site, drawn over the basemap floor. */
function RangeRings({ color }: { color: string }) {
  const geometries = useMemo(
    () =>
      RING_KM.map((r) => {
        const pts = new Float32Array((RING_SEGMENTS + 1) * 3)
        for (let i = 0; i <= RING_SEGMENTS; i++) {
          const a = (i / RING_SEGMENTS) * Math.PI * 2
          pts[i * 3] = Math.sin(a) * r
          pts[i * 3 + 1] = 0.2
          pts[i * 3 + 2] = -Math.cos(a) * r
        }
        const g = new BufferGeometry()
        g.setAttribute('position', new BufferAttribute(pts, 3))
        return g
      }),
    [],
  )
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries])

  return (
    <>
      {geometries.map((g, i) => (
        <line key={RING_KM[i]}>
          <primitive object={g} attach="geometry" />
          <lineBasicMaterial color={color} transparent opacity={0.35} />
        </line>
      ))}
    </>
  )
}

/**
 * Ground reference for the 3D view: the basemap for the radar's footprint
 * laid flat at true ground level, dimmed so it orients without competing
 * with the reflectivity colours, plus range rings at 50/100/150 km.
 */
export function GroundPlane({
  radiusKm,
  opacity,
  onLoadingChange,
}: {
  radiusKm: number
  opacity: number
  /** Reports the basemap render, which is the slowest part of this view. */
  onLoadingChange?: (loading: boolean) => void
}) {
  const site = useRadar((s) => s.site)
  const scheme = useComputedColorScheme('dark')
  const [image, setImage] = useState<GroundImage | null>(null)

  useEffect(() => {
    if (!site) {
      setImage(null)
      onLoadingChange?.(false)
      return
    }
    let cancelled = false
    onLoadingChange?.(true)
    const done = (img: GroundImage | null): void => {
      if (cancelled) return
      if (img) setImage(img)
      onLoadingChange?.(false)
    }
    void renderGroundImage(site, radiusKm, scheme)
      .then(done)
      .catch(() => done(null))
    return () => {
      cancelled = true
      onLoadingChange?.(false)
    }
  }, [site, radiusKm, scheme, onLoadingChange])

  const texture = useMemo(() => {
    if (!image) return null
    const t = new CanvasTexture(image.canvas)
    t.colorSpace = SRGBColorSpace
    return t
  }, [image])

  useEffect(() => () => texture?.dispose(), [texture])

  const ringColor = scheme === 'dark' ? '#7f8c9b' : '#4a5560'

  return (
    <>
      {texture && image && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[image.widthKm, image.heightKm]} />
          <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} />
        </mesh>
      )}
      <RangeRings color={ringColor} />
    </>
  )
}
