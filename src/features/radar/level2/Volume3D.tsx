import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Button, Group, Slider, Stack, Text } from '@mantine/core'
import { DoubleSide } from 'three'
import { onVolume, requestVolume } from '@/features/radar/level2/bridge'
import { useRadar } from '@/features/radar/level2/store'
import { buildTiltMesh } from '@/features/radar/level2/volumeGeometry'
import { GroundPlane } from '@/features/radar/level2/GroundPlane'
import { CameraBearing, ViewCompass, ViewLoading } from '@/features/radar/level2/ViewCompass'
import { ReorientButton } from '@/ui/ReorientButton'
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
  // Dragged value vs committed value. Every threshold change rebuilds every
  // tilt surface (tens of ms on a full volume), so the meshes follow the
  // release while the readout follows the thumb.
  const [thresholdDrag, setThresholdDrag] = useState(30)
  const [threshold, setThreshold] = useState(30)
  const [groundOpacity, setGroundOpacity] = useState(55)
  const [bearing, setBearing] = useState(0)
  const [volumeLoading, setVolumeLoading] = useState(false)
  const [groundLoading, setGroundLoading] = useState(false)
  const stallRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)
  const site = useRadar((s) => s.site)
  const tiltCount = useRadar((s) => s.tilts.length)

  /** Ask the worker for a volume, showing the spinner until it answers. */
  const ask = useCallback((): void => {
    if (!requestVolume()) return
    setVolumeLoading(true)
    // The worker owns no timeout of its own; don't spin forever if it never answers.
    clearTimeout(stallRef.current)
    stallRef.current = setTimeout(() => setVolumeLoading(false), 20_000)
  }, [])

  useEffect(() => {
    const off = onVolume((m) => {
      clearTimeout(stallRef.current)
      setVolumeLoading(false)
      setTilts(m.tilts)
    })
    return () => {
      clearTimeout(stallRef.current)
      off()
    }
  }, [])

  // The worker only builds a volume when asked, so ask again whenever a new
  // elevation lands. Radials filling in an existing tilt don't re-trigger —
  // that would rebuild the whole grid every chunk; Refresh covers it.
  useEffect(() => {
    if (!site) {
      setTilts([])
      return
    }
    ask()
  }, [site, tiltCount, ask])

  const busy = volumeLoading || groundLoading
  const msg = !site
    ? 'No radar attached — pick one in the Radar panel, or zoom in past z6.'
    : tilts.length === 0
      ? 'Waiting for radials — the echo builds as the volume streams in.'
      : null

  return (
    <Stack gap="xs" h="100%" p="xs" style={{ minHeight: 0 }}>
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm" fw={600}>
          {site ? `${site.id} · 3D echo` : '3D echo'}
        </Text>
        <Button size="compact-xs" variant="light" disabled={!site} onClick={ask}>
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
          ≥{thresholdDrag} dBZ
        </Text>
        <Slider
          flex={1}
          size="xs"
          min={10}
          max={60}
          step={5}
          value={thresholdDrag}
          onChange={setThresholdDrag}
          onChangeEnd={setThreshold}
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
            ref={controlsRef}
            enablePan
            screenSpacePanning={false}
            minDistance={40}
            maxDistance={900}
          />
        </Canvas>
        <ViewCompass bearing={bearing} />
        {busy && <ViewLoading />}
        <ReorientButton
          onClick={() => controlsRef.current?.reset()}
          size={30}
          label="Reset camera"
          style={{ right: 8, bottom: 8 }}
        />
      </div>
      <Text size="xs" c="dimmed">
        Surfaces are the radar's actual beam cones (vertical ×{VERTICAL_EXAGGERATION});
        gaps between tilts are unsampled air, not missing echo. Rings 50/100/150 km.
        Drag to orbit, right-drag to pan, scroll to zoom.
      </Text>
    </Stack>
  )
}
