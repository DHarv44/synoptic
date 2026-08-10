import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Map as MLMap, Marker, setWorkerUrl, type MapMouseEvent } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-csp-worker?url'
import 'maplibre-gl/dist/maplibre-gl.css'

// Explicit worker URL: the default inlined-blob worker fails silently in
// some sandboxed webviews (vector tiles never load, raster unaffected).
setWorkerUrl(workerUrl)
import { useComputedColorScheme } from '@mantine/core'
import { styleUrl } from '@/map/style'
import { useProbe } from '@/core/probe/store'
import { useCameraStore } from '@/map/cameraStore'
import { listFeatures } from '@/core/settings/registry'
import { useFeatureEnabled } from '@/core/settings/store'
import { attachDevStore } from '@/dev/wx'
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
  const setPoint = useProbe((s) => s.setPoint)

  // Create the map once.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const map = new MLMap({
      container,
      style: styleUrl(scheme),
      center: [-95, 38],
      zoom: 3.4,
      hash: false,
      attributionControl: { compact: true },
    })
    map.on('style.load', () => {
      map.setProjection({ type: 'globe' })
      setCtx((prev) => ({ map, styleVersion: (prev?.styleVersion ?? 0) + 1 }))
    })
    map.on('click', (e: MapMouseEvent) => {
      setPoint({ lat: e.lngLat.lat, lon: e.lngLat.lng })
    })
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

  // Fly-to requests from search/panels.
  const flyTarget = useCameraStore((s) => s.target)
  useEffect(() => {
    if (!ctx || !flyTarget) return
    ctx.map.flyTo({ center: [flyTarget.lon, flyTarget.lat], zoom: Math.max(ctx.map.getZoom(), 7) })
    useCameraStore.getState().consume()
  }, [ctx, flyTarget])

  const layerFeatures = listFeatures().filter((f) => f.layerComponent)

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      {ctx && (
        <MapContext.Provider value={ctx}>
          {layerFeatures.map((f) => (
            <FeatureLayer key={f.id} manifest={f} />
          ))}
          <ProbeMapMarker />
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
