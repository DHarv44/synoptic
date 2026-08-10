import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Globe } from '@/scene/Globe'
import { Coastlines } from '@/scene/Coastlines'
import { ProbeMarker } from '@/scene/ProbeMarker'
import { useSceneColors } from '@/scene/colors'
import { useProbe } from '@/core/probe/store'
import { listFeatures } from '@/core/settings/registry'
import { useFeatureEnabled } from '@/core/settings/store'
import type { FeatureManifest } from '@/core/settings/types'

function FeatureLayer({ manifest }: { manifest: FeatureManifest }) {
  const enabled = useFeatureEnabled(manifest.id)
  const Layer = manifest.layerComponent
  if (!enabled || !Layer) return null
  return <Layer />
}

/** The center viewport scene: globe + registry-contributed layers. */
export function GlobeCanvas() {
  const colors = useSceneColors()
  const setPoint = useProbe((s) => s.setPoint)
  const layerFeatures = listFeatures().filter((f) => f.layerComponent)

  return (
    <Canvas camera={{ position: [0, 0, 2.8], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={[colors.background]} />
      <Globe
        dayColor={colors.day}
        nightColor={colors.night}
        onPick={(lat, lon) => setPoint({ lat, lon })}
      />
      <Coastlines color={colors.coastline} />
      {layerFeatures.map((f) => (
        <FeatureLayer key={f.id} manifest={f} />
      ))}
      <ProbeMarker color={colors.probe} />
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={1.15}
        maxDistance={5}
        zoomSpeed={0.6}
        rotateSpeed={0.5}
      />
    </Canvas>
  )
}
