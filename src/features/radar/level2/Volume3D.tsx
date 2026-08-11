import { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Button, Group, Slider, Stack, Text } from '@mantine/core'
import { DoubleSide } from 'three'
import { currentSite, onVolume, requestVolume } from '@/features/radar/level2/bridge'
import { buildTiltMesh } from '@/features/radar/level2/volumeGeometry'
import type { VolumeTilt } from '@/features/radar/level2/worker'

const VERTICAL_EXAGGERATION = 4

function TiltSurfaces({ tilts, threshold }: { tilts: VolumeTilt[]; threshold: number }) {
  const meshes = useMemo(
    () =>
      tilts
        .map((t) => ({ t, mesh: buildTiltMesh(t, threshold, VERTICAL_EXAGGERATION) }))
        .filter((m): m is { t: VolumeTilt; mesh: NonNullable<ReturnType<typeof buildTiltMesh>> } =>
          m.mesh !== null,
        ),
    [tilts, threshold],
  )

  return (
    <>
      {meshes.map(({ t, mesh }) => (
        <mesh key={t.elevationDeg}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[mesh.positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[mesh.colors, 3]} />
          </bufferGeometry>
          <meshBasicMaterial vertexColors side={DoubleSide} transparent opacity={0.85} />
        </mesh>
      ))}
    </>
  )
}

/**
 * 3D echo structure: each retained tilt drawn as its true conical sampling
 * surface, colored by reflectivity. Vertical scale is exaggerated ×4 —
 * storms are far wider than they are tall.
 */
export function Volume3D() {
  const [tilts, setTilts] = useState<VolumeTilt[]>([])
  const [threshold, setThreshold] = useState(30)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const off = onVolume((m) => {
      setTilts(m.tilts)
      setMsg(m.tilts.length === 0 ? 'No sweeps retained yet — waiting for radials.' : null)
    })
    // The layer's worker may not exist yet (site still resolving) — retry.
    let tries = 0
    const timer = setInterval(() => {
      if (requestVolume() || tries++ > 10) {
        clearInterval(timer)
        if (tries > 10) setMsg('Zoom in past z6 so a Level 2 site is active.')
      }
    }, 1500)
    if (requestVolume()) clearInterval(timer)
    return () => {
      clearInterval(timer)
      off()
    }
  }, [])

  const site = currentSite()

  return (
    <Stack gap="xs">
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm" fw={600}>
          {site ? `${site.id} · 3D echo` : '3D echo'}
        </Text>
        <Button
          size="compact-xs"
          variant="light"
          onClick={() => {
            if (!requestVolume()) setMsg('Zoom in past z6 so a Level 2 site is active.')
          }}
        >
          Refresh
        </Button>
      </Group>
      {msg && (
        <Text size="xs" c="dimmed">
          {msg}
        </Text>
      )}
      <Group gap="xs" wrap="nowrap">
        <Text size="xs" c="dimmed" w={54}>
          ≥{threshold} dBZ
        </Text>
        <Slider
          flex={1}
          size="xs"
          min={10}
          max={60}
          step={5}
          value={threshold}
          onChange={setThreshold}
          label={(v) => `${v} dBZ`}
        />
      </Group>
      <div style={{ height: 280, borderRadius: 4, overflow: 'hidden' }}>
        <Canvas camera={{ position: [0, 90, 190], fov: 45, far: 4000 }} dpr={[1, 2]}>
          <color attach="background" args={['#0b0e12']} />
          <gridHelper args={[360, 12, '#2c3440', '#1d232c']} />
          <TiltSurfaces tilts={tilts} threshold={threshold} />
          <OrbitControls enablePan={false} minDistance={40} maxDistance={900} />
        </Canvas>
      </div>
      <Text size="xs" c="dimmed">
        Surfaces are the radar's actual beam cones (vertical ×{VERTICAL_EXAGGERATION});
        gaps between tilts are unsampled air, not missing echo. Grid 30 km.
      </Text>
    </Stack>
  )
}
