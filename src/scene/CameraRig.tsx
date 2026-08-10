import { useFrame, useThree } from '@react-three/fiber'
import { latLonToVec3 } from '@/scene/geo'
import { useCameraStore } from '@/scene/cameraStore'

const FLY_LERP = 0.08
const ARRIVE_EPSILON = 0.01

/** Animates the camera toward fly-to targets while preserving zoom distance. */
export function CameraRig() {
  const camera = useThree((s) => s.camera)

  useFrame(() => {
    const target = useCameraStore.getState().target
    if (!target) return
    const distance = camera.position.length()
    const goal = latLonToVec3(target.lat, target.lon, 1).multiplyScalar(distance)
    camera.position.lerp(goal, FLY_LERP)
    camera.lookAt(0, 0, 0)
    if (camera.position.distanceTo(goal) < ARRIVE_EPSILON) {
      useCameraStore.getState().consume()
    }
  })

  return null
}
