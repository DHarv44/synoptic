import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Button, Group, Slider, Stack, Text } from '@mantine/core'
import { DoubleSide } from 'three'
import { currentSite, onVolume, requestVolume } from '@/features/radar/level2/bridge'
import { buildTiltMesh } from '@/features/radar/level2/volumeGeometry'
import { GroundPlane } from '@/features/radar/level2/GroundPlane'
import { CameraBearing, ViewCompass, ViewLoading } from '@/features/radar/level2/ViewCompass'
import type { VolumeTilt } from '@/features/radar/level2/worker'

const VERTICAL_EXAGGERATION = 4
/** Matches the worker's volume export extent so floor and echo agree. */
const GROUND_RADIUS_KM = 180

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
  const [groundOpacity, setGroundOpacity] = useState(55)
  const [msg, setMsg] = useState<string | null>(null)
  const [bearing, setBearing] = useState(0)
  const [volumeLoading, setVolumeLoading] = useState(false)
  const [groundLoading, setGroundLoading] = useState(false)
  const stallRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  /** Ask the worker for a volume, showing the spinner until it answers. */
  const ask = useCallback((): boolean => {
    if (!requestVolume()) return false
    setVolumeLoading(true)
    // The worker owns no timeout of its own; don't spin forever if it never answers.
    clearTimeout(stallRef.current)
    stallRef.current = setTimeout(() => setVolumeLoading(false), 20_000)
    return true
  }, [])

  useEffect(() => {
    const off = onVolume((m) => {
      clearTimeout(stallRef.current)
      setVolumeLoading(false)
      setTilts(m.tilts)
      setMsg(m.tilts.length === 0 ? 'No sweeps retained yet — waiting for radials.' : null)
    })
    // The layer's worker may not exist yet (site still resolving) — retry.
    let tries = 0
    const timer = setInterval(() => {
      if (ask() || tries++ > 10) {
        clearInterval(timer)
        if (tries > 10) setMsg('Zoom in past z6 so a Level 2 site is active.')
      }
    }, 1500)
    if (ask()) clearInterval(timer)
    return () => {
      clearInterval(timer)
      clearTimeout(stallRef.current)
      off()
    }
  }, [ask])

  const site = currentSite()
  const busy = volumeLoading || groundLoading

  return (
    <Stack gap="xs" h="100%" p="xs" style={{ minHeight: 0 }}>
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm" fw={600}>
          {site ? `${site.id} · 3D echo` : '3D echo'}
        </Text>
        <Button
          size="compact-xs"
          variant="light"
          onClick={() => {
            if (!ask()) setMsg('Zoom in past z6 so a Level 2 site is active.')
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
      <Group gap="xs" wrap="nowrap">
        <Text size="xs" c="dimmed" w={54}>
          ground
        </Text>
        <Slider
          flex={1}
          size="xs"
          min={0}
          max={100}
          step={5}
          value={groundOpacity}
          onChange={setGroundOpacity}
          label={(v) => `${v}%`}
        />
      </Group>
      <div
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 220,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <Canvas camera={{ position: [0, 150, 200], fov: 45, far: 4000 }} dpr={[1, 2]}>
          <color attach="background" args={['#0b0e12']} />
          <GroundPlane
            radiusKm={GROUND_RADIUS_KM}
            opacity={groundOpacity / 100}
            onLoadingChange={setGroundLoading}
          />
          <TiltSurfaces tilts={tilts} threshold={threshold} />
          <CameraBearing onChange={setBearing} />
          {/* Left drag orbits, right drag pans across the ground, wheel zooms. */}
          <OrbitControls
            enablePan
            screenSpacePanning={false}
            minDistance={40}
            maxDistance={900}
          />
        </Canvas>
        <ViewCompass bearing={bearing} />
        {busy && <ViewLoading />}
      </div>
      <Text size="xs" c="dimmed">
        Surfaces are the radar's actual beam cones (vertical ×{VERTICAL_EXAGGERATION});
        gaps between tilts are unsampled air, not missing echo. Rings 50/100/150 km.
        Drag to orbit, right-drag to pan, scroll to zoom.
      </Text>
    </Stack>
  )
}
