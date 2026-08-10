import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Points,
  ShaderMaterial,
} from 'three'
import { GLOBE_RADIUS, latLonToVec3 } from '@/scene/geo'
import { RENDER_ORDER } from '@/scene/renderOrder'
import {
  MAX_STRIKES,
  STRIKE_TTL_MS,
  connectLightning,
  strikeBuffer,
} from '@/features/lightning/service'

const LAYER_RADIUS = GLOBE_RADIUS * 1.003

// Times are rebased against this epoch before hitting float32 GPU
// attributes — raw epoch-ms would quantize ages to ~2 minutes.
const TIME_EPOCH = Date.now()

const VERT = /* glsl */ `
attribute float aTime;
uniform float uNow;
varying float vAge;
void main() {
  vAge = (uNow - aTime) / ${STRIKE_TTL_MS.toFixed(1)};
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float recent = 1.0 - smoothstep(0.0, 0.02, vAge);
  gl_PointSize = 2.0 + recent * 6.0;
  gl_Position = projectionMatrix * mv;
}
`

const FRAG = /* glsl */ `
varying float vAge;
void main() {
  if (vAge < 0.0 || vAge > 1.0) discard;
  vec2 c = gl_PointCoord - 0.5;
  if (dot(c, c) > 0.25) discard;
  float flash = 1.0 - smoothstep(0.0, 0.015, vAge);
  vec3 color = mix(vec3(1.0, 0.85, 0.3), vec3(1.0, 1.0, 1.0), flash);
  float alpha = (1.0 - vAge) * 0.85 + flash * 0.15;
  gl_FragColor = vec4(color, alpha);
}
`

/** Live lightning strikes: white flash decaying to amber over 10 minutes. */
export function LightningLayer() {
  const pointsRef = useRef<Points>(null)

  const { geometry, material } = useMemo(() => {
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(new Float32Array(MAX_STRIKES * 3), 3))
    geo.setAttribute('aTime', new BufferAttribute(new Float32Array(MAX_STRIKES), 1))
    geo.setDrawRange(0, 0)
    const mat = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uNow: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    return { geometry: geo, material: mat }
  }, [])

  useEffect(() => connectLightning(), [])
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  const countRef = useRef(-1)
  useFrame(() => {
    const strikes = strikeBuffer.strikes
    material.uniforms.uNow.value = Date.now() - TIME_EPOCH
    if (strikes.length === countRef.current) return
    countRef.current = strikes.length
    const pos = geometry.getAttribute('position') as BufferAttribute
    const times = geometry.getAttribute('aTime') as BufferAttribute
    for (let i = 0; i < strikes.length; i++) {
      const v = latLonToVec3(strikes[i].lat, strikes[i].lon, LAYER_RADIUS)
      pos.setXYZ(i, v.x, v.y, v.z)
      times.setX(i, strikes[i].timeMs - TIME_EPOCH)
    }
    pos.needsUpdate = true
    times.needsUpdate = true
    geometry.setDrawRange(0, strikes.length)
  })

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      renderOrder={RENDER_ORDER.lightning}
      frustumCulled={false}
    />
  )
}
