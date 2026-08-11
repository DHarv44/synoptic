import { useEffect, useRef, useState } from 'react'
import type { MapMouseEvent } from 'maplibre-gl'
import { useMapContext } from '@/map/MapView'
import { useMapLayer, firstSymbolLayerId } from '@/map/useMapLayer'
import { useMapView } from '@/map/viewStore'
import { useFeatureOption, featureEnabled } from '@/core/settings/store'
import { reportError, reportOk } from '@/core/data/healthStore'
import { fixtureActive } from '@/core/data/fixtures'
import type { SourceRef } from '@/core/data/types'
import { nearestSite, type RadarSite } from '@/features/radar/level2/sites'
import { fetchSoundingSeries, soundingAt } from '@/core/data/openMeteo/sounding'
import { bunkersRightMover, type UV } from '@/core/met/kinematics'
import { fetchChunk, findCurrentVolume, listVolumeChunks } from '@/features/radar/level2/volume'
import { RANGE_M, SweepGlLayer } from '@/features/radar/level2/SweepGlLayer'
import { Level2Control, type ProbeReadout } from '@/features/radar/level2/Level2Control'
import type {
  ColumnEntry,
  ColumnResultMessage,
  ProbeResultMessage,
  SectionResultMessage,
  SectionTilt,
  SweepMessage,
  TiltInfo,
  TiltsMessage,
  VolumeMessage,
} from '@/features/radar/level2/worker'
import { distanceKm, sampleLine, toAzRange, type LatLon } from '@/features/radar/level2/geometry'
import { SectionPlot } from '@/features/radar/level2/SectionPlot'
import { emitVolume, setLevel2Worker } from '@/features/radar/level2/bridge'

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

/** Single-site Level 2: streaming sweeps, tilt/moment control, gate probe. */
export function Level2Layer() {
  const { map } = useMapContext()
  const bounds = useMapView((s) => s.bounds)
  const opacity = useFeatureOption<number>('level2', 'opacity')
  const [site, setSite] = useState<RadarSite | null>(null)
  const [tilts, setTilts] = useState<TiltInfo[]>([])
  const [sel, setSel] = useState({ elevNum: 1, moment: 'REF' })
  const [probe, setProbe] = useState<ProbeReadout | null>(null)
  const [srv, setSrv] = useState(false)
  const [raw, setRaw] = useState(false)
  const [storm, setStorm] = useState<UV | null>(null)
  const [column, setColumn] = useState<ColumnEntry[] | null>(null)
  const [section, setSection] = useState<SectionTilt[] | null>(null)
  const [sectionMeta, setSectionMeta] = useState<{ ranges: number[]; lengthKm: number } | null>(null)
  const [sectionLine, setSectionLine] = useState<LatLon[] | null>(null)
  const sectionARef = useRef<LatLon | null>(null)
  const layerRef = useRef<SweepGlLayer | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const lastClickRef = useRef<{ azDeg: number; rangeM: number } | null>(null)

  // Nearest site to view center while zoomed in.
  useEffect(() => {
    if (!bounds || map.getZoom() < MIN_ZOOM) {
      setSite(null)
      return
    }
    const lat = (bounds[1] + bounds[3]) / 2
    const lon = (bounds[0] + bounds[2]) / 2
    const s = nearestSite(lat, lon)
    setSite((prev) => (prev?.id === s?.id ? prev : s))
  }, [bounds, map])

  useMapLayer(
    (m) => {
      const layer = new SweepGlLayer()
      layerRef.current = layer
      m.addLayer(layer, firstSymbolLayerId(m))
      return () => {
        if (m.getLayer(layer.id)) m.removeLayer(layer.id)
        layerRef.current = null
      }
    },
    [],
  )

  useEffect(() => {
    if (layerRef.current) layerRef.current.opacity = opacity / 100
    map.triggerRepaint()
  }, [opacity, map])

  // Section line A→B drawn over the sweep.
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
        paint: {
          'line-color': '#ffd43b',
          'line-width': 2,
          'line-dasharray': [2, 1],
        },
      })
      return () => {
        if (m.getLayer('l2-section')) m.removeLayer('l2-section')
        if (m.getSource('l2-section')) m.removeSource('l2-section')
      }
    },
    [sectionLine],
  )

  // Storm motion (Bunkers right-mover) from the model sounding at the site.
  useEffect(() => {
    if (!site) {
      setStorm(null)
      return
    }
    let cancelled = false
    void fetchSoundingSeries(site.lat, site.lon)
      .then((series) => {
        const snd = soundingAt(series, Date.now())
        if (!cancelled && snd) setStorm(bunkersRightMover(snd.levels))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [site])

  // Push SRV state into the GL layer.
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
    setTilts([])
    setProbe(null)
    layerRef.current?.setSite(activeSite.lat, activeSite.lon)
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    setLevel2Worker(worker, activeSite)
    worker.onmessage = (ev: MessageEvent<WorkerOut>) => {
      const msg = ev.data
      if (msg.type === 'sweep') layerRef.current?.setSweep(msg)
      else if (msg.type === 'tilts') setTilts(msg.tilts)
      else if (msg.type === 'columnResult') setColumn(msg.column)
      else if (msg.type === 'sectionResult') setSection(msg.tilts)
      else if (msg.type === 'volume') emitVolume(msg)
      else if (msg.type === 'probeResult') {
        const click = lastClickRef.current
        if (!click) return
        const r = click.rangeM
        const beamM =
          r * Math.sin(msg.elevationDeg * DEG) + (r * r) / (2 * EFFECTIVE_EARTH_R)
        setProbe({ ...click, beamKft: (beamM * 3.28084) / 1000, values: msg.values })
      }
    }

    const onClick = (e: MapMouseEvent): void => {
      const here = { lat: e.lngLat.lat, lon: e.lngLat.lng }

      // Shift+click: first sets the section start, second draws the slice.
      if (e.originalEvent.shiftKey) {
        const a = sectionARef.current
        if (!a) {
          sectionARef.current = here
          setSectionLine([here, here])
          return
        }
        const pts = sampleLine(a, here, SECTION_SAMPLES)
        const azRanges = pts.map((p) => toAzRange(activeSite, p))
        sectionARef.current = null
        setSectionLine([a, here])
        setSectionMeta({
          ranges: azRanges.map((s) => s.rangeM),
          lengthKm: distanceKm(a, here),
        })
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
        const chunks = await listVolumeChunks(activeSite.id, volume)
        for (const c of chunks) {
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
    setSel({ elevNum, moment })
    workerRef.current?.postMessage({ type: 'select', elevNum, moment, raw: rawMode })
  }

  const stormMotion =
    storm === null
      ? null
      : `${Math.round((Math.atan2(-storm.u, -storm.v) / DEG + 360) % 360)}°/${Math.round(Math.hypot(storm.u, storm.v) * 1.94384)}kt`

  if (!site) return null
  return (
    <>
      {section && sectionMeta && (
        <SectionPlot
          tilts={section}
          sampleRangesM={sectionMeta.ranges}
          lengthKm={sectionMeta.lengthKm}
          onClose={() => {
            setSection(null)
            setSectionLine(null)
          }}
        />
      )}
      <Level2Control
      siteId={site.id}
      siteName={site.name}
      tilts={tilts}
      elevNum={sel.elevNum}
      moment={sel.moment}
      onSelect={select}
      probe={probe}
      column={column}
      srv={srv && storm !== null}
      raw={raw}
      onSrv={setSrv}
      onRaw={(on) => {
        setRaw(on)
        select(sel.elevNum, sel.moment, on)
      }}
        stormMotion={stormMotion}
      />
    </>
  )
}
