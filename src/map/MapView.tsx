import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Map as MLMap, Marker, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-csp-worker?url'
import 'maplibre-gl/dist/maplibre-gl.css'

// Explicit worker URL: the default inlined-blob worker fails silently in
// some sandboxed webviews (vector tiles never load, raster unaffected).
setWorkerUrl(workerUrl)
import { useComputedColorScheme } from '@mantine/core'
import { styleUrl } from '@/map/style'
import { useProbe } from '@/core/probe/store'
import { useCameraStore } from '@/map/cameraStore'
import { useMapView } from '@/map/viewStore'
import { useSavedCamera } from '@/map/cameraPersist'
import { strengthenLabels } from '@/map/labels'
import { useHealth } from '@/core/data/healthStore'
import { listFeatures } from '@/core/settings/registry'
import { useFeatureEnabled } from '@/core/settings/store'
import { attachDevStore } from '@/dev/wx'
import { MapPopup } from '@/map/popups/MapPopup'
import type { FeatureManifest } from '@/core/settings/types'

interface MapCtx {
  map: MLMap
  /** Increments every time the base style finishes (re)loading — layer
   *  effects key on this because setStyle wipes custom sources/layers. */
  styleVersion: number
}

const MapContext = createContext<MapCtx | null>(null)

export function useMapContext(): MapCtx {
  const ctx = useContext(MapContext)
  if (!ctx) throw new Error('useMapContext outside <MapView>')
  return ctx
}

function FeatureLayer({ manifest }: { manifest: FeatureManifest }) {
  const enabled = useFeatureEnabled(manifest.id)
  const Layer = manifest.layerComponent
  if (!enabled || !Layer) return null
  return <Layer />
}

/** The map surface: MapLibre globe with the registry's layers on top. */
export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const scheme = useComputedColorScheme('dark')
  const [ctx, setCtx] = useState<MapCtx | null>(null)

  // Create the map once.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    // Resume where the session left off; persist rehydrates synchronously.
    const saved = useSavedCamera.getState().camera
    const map = new MLMap({
      container,
      style: styleUrl(scheme),
      center: saved ? [saved.lon, saved.lat] : [-95, 38],
      zoom: saved?.zoom ?? 3.4,
      bearing: saved?.bearing ?? 0,
      pitch: saved?.pitch ?? 0,
      hash: false,
      // Attribution is rendered in the app footer (AttributionBar) so the
      // map surface stays clear for controls.
      attributionControl: false,
    })
    map.on('style.load', () => {
      // Mercator (not globe): custom WebGL layers (Level 2 sweeps, wind
      // particles) use plain mercator matrices, which globe projection
      // breaks. Globe returns when those layers adopt the projection API.
      map.setProjection({ type: 'mercator' })
      // Re-applied on every style load — setStyle discards these overrides.
      strengthenLabels(map, map.getStyle().name?.toLowerCase().includes('positron') ? 'light' : 'dark')
      setCtx((prev) => ({ map, styleVersion: (prev?.styleVersion ?? 0) + 1 }))
    })
    // Clicks are handled by MapPopup: an orb opens its card, the bare map
    // opens the location card. Retargeting the panels (the old blind
    // click-sets-probe) is a deliberate action inside that card now.
    const publishBounds = (): void => {
      const b = map.getBounds()
      useMapView.getState().setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()])
      const c = map.getCenter()
      useSavedCamera.getState().save({
        lon: c.lng,
        lat: c.lat,
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      })
    }
    map.on('moveend', publishBounds)
    map.on('load', publishBounds)
    // Tile/source loading is reported by the map, not by fetchJson.
    const setBusy = (busy: boolean) => () => useHealth.getState().setMapBusy(busy)
    map.on('dataloading', setBusy(true))
    map.on('idle', setBusy(false))
    attachDevStore('map', map)
    return () => {
      map.remove()
      setCtx(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scheme changes handled below
  }, [])

  // Swap base style on scheme change (style.load re-bumps styleVersion).
  useEffect(() => {
    ctx?.map.setStyle(styleUrl(scheme))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ctx identity churn
  }, [scheme])

  // Fly-to / fit-bounds requests from search/panels.
  const flyTarget = useCameraStore((s) => s.target)
  const fitTarget = useCameraStore((s) => s.fit)
  useEffect(() => {
    if (!ctx || !flyTarget) return
    ctx.map.flyTo({
      center: [flyTarget.lon, flyTarget.lat],
      zoom: Math.max(ctx.map.getZoom(), flyTarget.zoom ?? 7),
    })
    useCameraStore.getState().consume()
  }, [ctx, flyTarget])
  useEffect(() => {
    if (!ctx || !fitTarget) return
    ctx.map.fitBounds(
      [
        [fitTarget[0], fitTarget[1]],
        [fitTarget[2], fitTarget[3]],
      ],
      { padding: 60, maxZoom: 9 },
    )
    useCameraStore.getState().consumeFit()
  }, [ctx, fitTarget])

  // Reorient: north up, flat. Nonce starts at 0 so mounting doesn't move it.
  const resetNonce = useCameraStore((s) => s.resetNonce)
  useEffect(() => {
    if (!ctx || resetNonce === 0) return
    ctx.map.easeTo({ bearing: 0, pitch: 0, duration: 300 })
  }, [ctx, resetNonce])

  const layerFeatures = listFeatures().filter((f) => f.layerComponent)

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      {ctx && (
        <MapContext.Provider value={ctx}>
          {layerFeatures.map((f) => (
            <FeatureLayer key={f.id} manifest={f} />
          ))}
          <ProbeMapMarker />
          <MapPopup />
        </MapContext.Provider>
      )}
    </div>
  )
}

/** Probe location marker. */
function ProbeMapMarker() {
  const { map } = useMapContext()
  const point = useProbe((s) => s.point)
  const markerRef = useRef<Marker | null>(null)

  useEffect(() => {
    if (!point) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }
    if (!markerRef.current) {
      const el = document.createElement('div')
      el.style.cssText =
        'width:10px;height:10px;border-radius:50%;background:var(--mantine-color-orange-6);border:2px solid var(--mantine-color-body);box-shadow:0 0 6px rgba(0,0,0,.6)'
      markerRef.current = new Marker({ element: el }).setLngLat([point.lon, point.lat]).addTo(map)
    } else {
      markerRef.current.setLngLat([point.lon, point.lat])
    }
  }, [map, point])

  useEffect(
    () => () => {
      markerRef.current?.remove()
    },
    [],
  )
  return null
}
