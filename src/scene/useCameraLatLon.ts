import { useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { vec3ToLatLon } from '@/scene/geo'

export interface CameraView {
  lat: number
  lon: number
  dist: number
}

/** Throttled camera lat/lon/distance for layer logic inside the canvas. */
export function useCameraLatLon(intervalS = 0.5): CameraView {
  const camera = useThree((s) => s.camera)
  const [view, setView] = useState<CameraView>({ lat: 0, lon: 0, dist: 3 })
  const clockRef = useRef(intervalS) // fire on first frame

  useFrame((_, delta) => {
    clockRef.current += delta
    if (clockRef.current < intervalS) return
    clockRef.current = 0
    const { lat, lon } = vec3ToLatLon(camera.position)
    const dist = camera.position.length()
    setView((v) =>
      Math.abs(v.lat - lat) > 0.1 || Math.abs(v.lon - lon) > 0.1 || Math.abs(v.dist - dist) > 0.02
        ? { lat, lon, dist }
        : v,
    )
  })

  return view
}
