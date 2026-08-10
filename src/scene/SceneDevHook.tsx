import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { attachDevStore } from '@/dev/wx'

/** Exposes the three.js scene/camera on window.__wx for headless inspection. */
export function SceneDevHook() {
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    attachDevStore('three', { scene, camera, invalidate })
  }, [scene, camera, invalidate])

  return null
}
