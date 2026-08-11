import { useEffect, useRef, useState } from 'react'
import { useMapContext } from '@/map/MapView'
import { useMapLayer, firstSymbolLayerId } from '@/map/useMapLayer'
import { useMapView } from '@/map/viewStore'
import { useFeatureOption, featureEnabled } from '@/core/settings/store'
import { reportError, reportOk } from '@/core/data/healthStore'
import { fixtureActive } from '@/core/data/fixtures'
import type { SourceRef } from '@/core/data/types'
import { nearestSite, type RadarSite } from '@/features/radar/level2/sites'
import { fetchChunk, findCurrentVolume, listVolumeChunks } from '@/features/radar/level2/volume'
import { SweepGlLayer } from '@/features/radar/level2/SweepGlLayer'
import type { SweepMessage } from '@/features/radar/level2/worker'

export const L2_SOURCE: SourceRef = { id: 'nexrad-l2', label: 'NEXRAD Level 2' }

const POLL_MS = 15_000
const MIN_ZOOM = 6

/** Single-site Level 2 sweep: nearest site to the view, streaming chunks. */
export function Level2Layer() {
  const { map } = useMapContext()
  const bounds = useMapView((s) => s.bounds)
  const opacity = useFeatureOption<number>('level2', 'opacity')
  const [site, setSite] = useState<RadarSite | null>(null)
  const layerRef = useRef<SweepGlLayer | null>(null)

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

  // Custom GL layer lifecycle.
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

  // Chunk streaming loop per site.
  useEffect(() => {
    if (!site || fixtureActive()) return
    const activeSite = site
    layerRef.current?.setSite(activeSite.lat, activeSite.lon)
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (ev: MessageEvent<SweepMessage>) => {
      layerRef.current?.setSweep(ev.data)
    }

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
          worker.postMessage({ type: 'chunk', buf, isStart: c.kind === 'S', moment: 'REF' }, [buf])
          lastSeq = c.seq
          if (c.kind === 'E') volume = 0 // volume complete → rediscover next cycle
        }
        reportOk(L2_SOURCE)
      } catch (e) {
        if (String(e).includes('disabled') === false) {
          reportError(L2_SOURCE, e instanceof Error ? e.message : String(e))
        }
      }
      if (!stopped) timer = setTimeout(() => void cycle(), POLL_MS)
    }
    void cycle()

    return () => {
      stopped = true
      if (timer !== undefined) clearTimeout(timer)
      worker.terminate()
    }
  }, [site])

  return null
}
