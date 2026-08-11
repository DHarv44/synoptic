import { useEffect } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { useMapLayer } from '@/map/useMapLayer'
import { useMapContext } from '@/map/MapView'
import { STRIKE_TTL_MS, connectLightning, strikeBuffer } from '@/features/lightning/service'
import { makeBoltImage } from '@/features/lightning/boltIcon'

const UPDATE_MS = 1000
/**
 * Ages drive the fade, so a redraw is due even with no new strikes — but
 * over a 10-minute decay, coarse steps are indistinguishable. New strikes
 * still appear on the next tick; only the fade is throttled.
 */
const FADE_REDRAW_MS = 5000

function toGeojson(nowMs: number): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: strikeBuffer.strikes.map((s) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      properties: { age: (nowMs - s.timeMs) / STRIKE_TTL_MS },
    })),
  }
}

/** Live lightning: white flash decaying to amber over 10 minutes. */
export function LightningLayer() {
  const { map } = useMapContext()
  useEffect(() => connectLightning(), [])

  useMapLayer(
    (m) => {
      if (!m.hasImage('bolt-amber')) m.addImage('bolt-amber', makeBoltImage('#ffd43b', null), { pixelRatio: 2 })
      if (!m.hasImage('bolt-flash')) m.addImage('bolt-flash', makeBoltImage('#ffffff', '#ffe066'), { pixelRatio: 2 })
      m.addSource('lightning', { type: 'geojson', data: toGeojson(Date.now()) })
      // Aging strikes: amber bolts fading/shrinking over the 10-min TTL.
      m.addLayer({
        id: 'lightning',
        type: 'symbol',
        source: 'lightning',
        filter: ['>=', ['get', 'age'], 0.04],
        layout: {
          'icon-image': 'bolt-amber',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-size': ['interpolate', ['linear'], ['get', 'age'], 0.04, 0.55, 1, 0.35],
        },
        paint: {
          'icon-opacity': ['interpolate', ['linear'], ['get', 'age'], 0.04, 0.9, 1, 0.15],
        },
      })
      // Fresh strikes (< ~25s): larger white flash bolt.
      m.addLayer({
        id: 'lightning-flash',
        type: 'symbol',
        source: 'lightning',
        filter: ['<', ['get', 'age'], 0.04],
        layout: {
          'icon-image': 'bolt-flash',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-size': 0.8,
        },
      })
      return () => {
        for (const id of ['lightning', 'lightning-flash']) {
          if (m.getLayer(id)) m.removeLayer(id)
        }
        if (m.getSource('lightning')) m.removeSource('lightning')
      }
    },
    [],
  )

  // Refresh strike ages/positions. Rebuilding the collection allocates a
  // feature per strike (up to MAX_STRIKES) and makes MapLibre re-parse the
  // source, so skip it when nothing has changed and no fade step is due.
  useEffect(() => {
    let lastVersion = -1
    let lastDraw = 0
    const id = setInterval(() => {
      const src = map.getSource('lightning') as GeoJSONSource | undefined
      if (!src) return
      const now = Date.now()
      strikeBuffer.prune(now)
      const changed = strikeBuffer.version !== lastVersion
      const fadeDue = strikeBuffer.strikes.length > 0 && now - lastDraw >= FADE_REDRAW_MS
      if (!changed && !fadeDue) return
      lastVersion = strikeBuffer.version
      lastDraw = now
      src.setData(toGeojson(now))
    }, UPDATE_MS)
    return () => clearInterval(id)
  }, [map])

  return null
}
