import { useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, ShaderMaterial, Vector3 } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { GLOBE_RADIUS, latLonToVec3, subsolarPoint, vec3ToLatLon } from '@/scene/geo'
import { useTimeline } from '@/core/time/timelineStore'

const VERT = /* glsl */ `
varying vec3 vPos;
void main() {
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAG = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uDayColor;
uniform vec3 uNightColor;
varying vec3 vPos;
void main() {
  float d = dot(normalize(vPos), uSunDir);
  float t = smoothstep(-0.12, 0.12, d);
  gl_FragColor = vec4(mix(uNightColor, uDayColor, t), 1.0);
}
`

interface GlobeProps {
  dayColor: string
  nightColor: string
  onPick: (lat: number, lon: number) => void
}

/** The sphere: day/night terminator driven by timeline sim-time; click picking. */
export function Globe({ dayColor, nightColor, onPick }: GlobeProps) {
  // Rebuild the material once after mount: a custom shader's first GPU
  // program can freeze a uniform (see memory: stale-first-shader-program).
  const [matGen, setMatGen] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMatGen(1))
    return () => cancelAnimationFrame(id)
  }, [])

  const material = useMemo(() => {
    return new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uSunDir: { value: new Vector3(1, 0, 0) },
        uDayColor: { value: new Color(dayColor) },
        uNightColor: { value: new Color(nightColor) },
      },
    })
    // matGen forces the post-mount rebuild
  }, [dayColor, nightColor, matGen])

  useFrame(() => {
    const sun = subsolarPoint(useTimeline.getState().simTime)
    const dir = latLonToVec3(sun.lat, sun.lon, 1)
    ;(material.uniforms.uSunDir.value as Vector3).copy(dir)
  })

  function handleClick(e: ThreeEvent<MouseEvent>): void {
    if (e.delta > 5) return // drag, not a click
    e.stopPropagation()
    const { lat, lon } = vec3ToLatLon(e.point)
    onPick(lat, lon)
  }

  return (
    <mesh material={material} onClick={handleClick}>
      <sphereGeometry args={[GLOBE_RADIUS, 96, 48]} />
    </mesh>
  )
}
