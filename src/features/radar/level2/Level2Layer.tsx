import { useEffect, useRef } from 'react'
import type { MapMouseEvent } from 'maplibre-gl'
import { useMapContext } from '@/map/MapView'
import { useMapLayer, firstSymbolLayerId } from '@/map/useMapLayer'
import { useMapView } from '@/map/viewStore'
import { useFeatureOption, featureEnabled } from '@/core/settings/store'
import { reportError, reportOk } from '@/core/data/healthStore'
import { fixtureActive } from '@/core/data/fixtures'
import type { SourceRef } from '@/core/data/types'
import { fetchSoundingSeries, soundingAt } from '@/core/data/openMeteo/sounding'
import { bunkersRightMover } from '@/core/met/kinematics'
import { nearestSite } from '@/features/radar/level2/sites'
import { fetchChunk, findCurrentVolume, listVolumeChunks } from '@/features/radar/level2/volume'
import { RANGE_M, SweepGlLayer } from '@/features/radar/level2/SweepGlLayer'
import { Level2Control } from '@/features/radar/level2/Level2Control'
import { useRadar } from '@/features/radar/level2/store'
import { distanceKm, sampleLine, toAzRange } from '@/features/radar/level2/geometry'
import { emitVolume, setLevel2Worker } from '@/features/radar/level2/bridge'
import type {
  ColumnResultMessage,
  ProbeResultMessage,
  SectionResultMessage,
  SweepMessage,
  TiltsMessage,
  VolumeMessage,
} from '@/features/radar/level2/worker'

export const L2_SOURCE: SourceRef = { id: 'nexrad-l2', label: 'NEXRAD Level 2' }

const POLL_MS = 15_000
const MIN_ZOOM = 6
const DEG = Math.PI / 180
const EFFECTIVE_EARTH_R = (4 / 3) * 6_371_000
const SECTION_SAMPLES = 80

type WorkerOut =
  | SweepMessage
  | TiltsMessage
  | ProbeResultMessage
  | ColumnResultMessage
  | SectionResultMessage
  | VolumeMessage

/** Single-site Level 2: streams sweeps, drives the shared radar store. */
export function Level2Layer() {
  const { map } = useMapContext()
  const bounds = useMapView((s) => s.bounds)
  const opacity = useFeatureOption<number>('level2', 'opacity')
  const site = useRadar((s) => s.site)
  const srv = useRadar((s) => s.srv)
  const raw = useRadar((s) => s.raw)
  const storm = useRadar((s) => s.storm)
  const sectionLine = useRadar((s) => s.sectionLine)
  const layerRef = useRef<SweepGlLayer | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const lastClickRef = useRef<{ azDeg: number; rangeM: number } | null>(null)
  const sectionRangesRef = useRef<{ ranges: number[]; lengthKm: number } | null>(null)

  // Nearest site to view centre while zoomed in.
  useEffect(() => {
    if (!bounds || map.getZoom() < MIN_ZOOM) {
      if (useRadar.getState().site) useRadar.getState().resetSite(null)
      return
    }
    const next = nearestSite((bounds[1] + bounds[3]) / 2, (bounds[0] + bounds[2]) / 2)
    if (next?.id !== useRadar.getState().site?.id) useRadar.getState().resetSite(next)
  }, [bounds, map])

  useMapLayer((m) => {
    const layer = new SweepGlLayer()
    layerRef.current = layer
    m.addLayer(layer, firstSymbolLayerId(m))
    return () => {
      if (m.getLayer(layer.id)) m.removeLayer(layer.id)
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (layerRef.current) layerRef.current.opacity = opacity / 100
    map.triggerRepaint()
  }, [opacity, map])

  // Section line drawn over the sweep.
  useMapLayer(
    (m) => {
      const data: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: sectionLine
          ? [
              {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: sectionLine.map((p) => [p.lon, p.lat]),
                },
              },
            ]
          : [],
      }
      m.addSource('l2-section', { type: 'geojson', data })
      m.addLayer({
        id: 'l2-section',
        type: 'line',
        source: 'l2-section',
        paint: { 'line-color': '#ffd43b', 'line-width': 2, 'line-dasharray': [2, 1] },
      })
      return () => {
        if (m.getLayer('l2-section')) m.removeLayer('l2-section')
        if (m.getSource('l2-section')) m.removeSource('l2-section')
      }
    },
    [sectionLine],
  )

  // Cross-section drawing: crosshair cursor, rubber-band line, Esc cancels.
  const drawing = useRadar((s) => s.drawing)
  useEffect(() => {
    if (!drawing) {
      map.getCanvas().style.cursor = ''
      return
    }
    map.getCanvas().style.cursor = 'crosshair'

    const onMove = (e: MapMouseEvent): void => {
      const start = useRadar.getState().drawStart
      if (start) {
        useRadar.getState().set({
          sectionLine: [start, { lat: e.lngLat.lat, lon: e.lngLat.lng }],
        })
      }
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') useRadar.getState().cancelDraw()
    }
    map.on('mousemove', onMove)
    window.addEventListener('keydown', onKey)
    return () => {
      map.getCanvas().style.cursor = ''
      map.off('mousemove', onMove)
      window.removeEventListener('keydown', onKey)
    }
  }, [drawing, map])

  // Storm motion (Bunkers right-mover) from the model sounding at the site.
  useEffect(() => {
    if (!site) return
    let cancelled = false
    void fetchSoundingSeries(site.lat, site.lon)
      .then((series) => {
        const snd = soundingAt(series, Date.now())
        if (!cancelled && snd) useRadar.getState().set({ storm: bunkersRightMover(snd.levels) })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [site])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    layer.srvEnabled = srv && storm !== null
    layer.stormU = storm?.u ?? 0
    layer.stormV = storm?.v ?? 0
    map.triggerRepaint()
  }, [srv, storm, map])

  // Streaming loop + worker per site.
  useEffect(() => {
    if (!site || fixtureActive()) return
    const activeSite = site
    layerRef.current?.setSite(activeSite.lat, activeSite.lon)
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    setLevel2Worker(worker, activeSite)

    worker.onmessage = (ev: MessageEvent<WorkerOut>) => {
      const msg = ev.data
      if (msg.type === 'sweep') layerRef.current?.setSweep(msg)
      else if (msg.type === 'tilts') useRadar.getState().set({ tilts: msg.tilts })
      else if (msg.type === 'columnResult') useRadar.getState().set({ column: msg.column })
      else if (msg.type === 'volume') emitVolume(msg)
      else if (msg.type === 'sectionResult') {
        const meta = sectionRangesRef.current
        if (meta) useRadar.getState().set({ section: { tilts: msg.tilts, ...meta } })
      } else if (msg.type === 'probeResult') {
        const click = lastClickRef.current
        if (!click) return
        const r = click.rangeM
        const beamM = r * Math.sin(msg.elevationDeg * DEG) + (r * r) / (2 * EFFECTIVE_EARTH_R)
        useRadar
          .getState()
          .set({ probe: { ...click, beamKft: (beamM * 3.28084) / 1000, values: msg.values } })
      }
    }

    const onClick = (e: MapMouseEvent): void => {
      const here = { lat: e.lngLat.lat, lon: e.lngLat.lng }
      const state = useRadar.getState()

      // Cross-section drawing: first click anchors, second completes.
      if (state.drawing) {
        const a = state.drawStart
        if (!a) {
          state.set({ drawStart: here, sectionLine: [here, here] })
          return
        }
        const azRanges = sampleLine(a, here, SECTION_SAMPLES).map((p) => toAzRange(activeSite, p))
        sectionRangesRef.current = {
          ranges: azRanges.map((s) => s.rangeM),
          lengthKm: distanceKm(a, here),
        }
        state.set({ sectionLine: [a, here], drawing: false, drawStart: null })
        worker.postMessage({ type: 'section', samples: azRanges })
        return
      }

      const { azDeg, rangeM } = toAzRange(activeSite, here)
      if (rangeM > RANGE_M) return
      lastClickRef.current = { azDeg, rangeM }
      worker.postMessage({ type: 'probe', azDeg, rangeM })
      worker.postMessage({ type: 'probeColumn', azDeg, rangeM })
    }
    map.on('click', onClick)

    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let volume = 0
    let lastSeq = 0

    async function cycle(): Promise<void> {
      if (stopped) return
      try {
        if (!featureEnabled('level2')) throw new Error('disabled')
        if (volume === 0) {
          volume = await findCurrentVolume(activeSite.id)
          lastSeq = 0
          worker.postMessage({ type: 'reset' })
        }
        for (const c of await listVolumeChunks(activeSite.id, volume)) {
          if (stopped) return
          if (c.seq <= lastSeq) continue
          const buf = await fetchChunk(c)
          worker.postMessage({ type: 'chunk', buf, isStart: c.kind === 'S' }, [buf])
          lastSeq = c.seq
          if (c.kind === 'E') volume = 0
        }
        reportOk(L2_SOURCE)
      } catch (e) {
        if (!String(e).includes('disabled')) {
          reportError(L2_SOURCE, e instanceof Error ? e.message : String(e))
        }
      }
      if (!stopped) timer = setTimeout(() => void cycle(), POLL_MS)
    }
    void cycle()

    return () => {
      stopped = true
      if (timer !== undefined) clearTimeout(timer)
      map.off('click', onClick)
      worker.terminate()
      workerRef.current = null
      setLevel2Worker(null, null)
    }
  }, [site, map])

  const select = (elevNum: number, moment: string, rawMode = raw): void => {
    useRadar.getState().set({ elevNum, moment })
    workerRef.current?.postMessage({ type: 'select', elevNum, moment, raw: rawMode })
  }

  const stormMotion =
    storm === null
      ? null
      : `${Math.round((Math.atan2(-storm.u, -storm.v) / DEG + 360) % 360)}°/${Math.round(Math.hypot(storm.u, storm.v) * 1.94384)}kt`

  return (
    <Level2Control
      onSelect={select}
      onSrv={(on) => useRadar.getState().set({ srv: on })}
      onRaw={(on) => {
        useRadar.getState().set({ raw: on })
        select(useRadar.getState().elevNum, useRadar.getState().moment, on)
      }}
      stormMotion={stormMotion}
    />
  )
}
