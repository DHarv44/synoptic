import { useEffect, useRef } from 'react'
import type { CustomLayerInterface, Map as MLMap } from 'maplibre-gl'
import { useMapContext } from '@/map/MapView'
import { useMapLayer } from '@/map/useMapLayer'
import { addDataLayer } from '@/map/layerOrder'
import { useFeatureOption } from '@/core/settings/store'
import { ParticleSystem } from '@/features/wind/ParticleSystem'
import { fetchWindField, type WindField } from '@/features/wind/service'

const SIM_MINUTES_PER_SECOND = 8 // sim time compression: readable motion

interface WindCustomLayer extends CustomLayerInterface {
  system: ParticleSystem | null
  opacity: number
  pointSize: number
  /** Latest fetched field; applied on setWind AND on (re)creation in onAdd —
   * the fetch usually resolves before MapLibre calls onAdd, and a field
   * delivered to a not-yet-created system used to vanish silently. */
  pendingField: WindField | null
}

function makeLayer(particleCount: number): WindCustomLayer {
  let lastT = 0
  const layer: WindCustomLayer = {
    id: 'wind-particles',
    type: 'custom',
    renderingMode: '2d',
    system: null,
    opacity: 0.8,
    pointSize: 1.6,
    pendingField: null,
    onAdd(_map: MLMap, gl: WebGLRenderingContext | WebGL2RenderingContext) {
      if (!(gl instanceof WebGL2RenderingContext)) throw new Error('WebGL2 required')
      this.system = new ParticleSystem(gl, particleCount)
      if (this.pendingField) this.system.setWind(this.pendingField)
    },
    onRemove() {
      this.system?.dispose()
      this.system = null
    },
    render(_gl: WebGLRenderingContext | WebGL2RenderingContext, args) {
      if (!this.system) return
      const now = performance.now()
      const dtReal = lastT === 0 ? 1 / 60 : Math.min((now - lastT) / 1000, 0.1)
      lastT = now
      this.system.step(dtReal * SIM_MINUTES_PER_SECOND * 60)
      const matrix = (args as unknown as { defaultProjectionData?: { mainMatrix?: number[] } })
        ?.defaultProjectionData?.mainMatrix ?? (args as unknown as number[])
      this.system.draw(matrix as number[], this.opacity, this.pointSize * devicePixelRatio)
    },
  }
  return layer
}

/** GPU wind particles from GFS at a selectable level. */
export function WindLayer() {
  const { map } = useMapContext()
  const level = useFeatureOption<string>('wind', 'level')
  const opacity = useFeatureOption<number>('wind', 'opacity')
  const countK = useFeatureOption<number>('wind', 'particles')
  const layerRef = useRef<WindCustomLayer | null>(null)
  const repaintRef = useRef<number>(0)

  useMapLayer(
    (m) => {
      const layer = makeLayer(countK * 1000)
      layerRef.current = layer
      addDataLayer(m, layer, 'wind')
      // Continuous repaint while the layer lives (throttled to rAF).
      const tick = (): void => {
        m.triggerRepaint()
        repaintRef.current = requestAnimationFrame(tick)
      }
      repaintRef.current = requestAnimationFrame(tick)
      return () => {
        cancelAnimationFrame(repaintRef.current)
        if (m.getLayer('wind-particles')) m.removeLayer('wind-particles')
        layerRef.current = null
      }
    },
    [countK],
  )

  // Wind data per level.
  useEffect(() => {
    let cancelled = false
    void fetchWindField(level).then((field) => {
      const layer = layerRef.current
      if (cancelled || !layer) return
      layer.pendingField = field
      layer.system?.setWind(field)
    }).catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [level, countK, map])

  useEffect(() => {
    if (layerRef.current) layerRef.current.opacity = opacity / 100
  }, [opacity])

  return null
}
