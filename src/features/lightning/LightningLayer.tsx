import { useEffect } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { useMapLayer } from '@/map/useMapLayer'
import { useMapContext } from '@/map/MapView'
import { STRIKE_TTL_MS, connectLightning, strikeBuffer } from '@/features/lightning/service'
import { makeBoltImage } from '@/features/lightning/boltIcon'

const UPDATE_MS = 1000

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

  // Refresh strike ages/positions once a second.
  useEffect(() => {
    const id = setInterval(() => {
      const src = map.getSource('lightning') as GeoJSONSource | undefined
      if (src) {
        strikeBuffer.prune(Date.now())
        src.setData(toGeojson(Date.now()))
      }
    }, UPDATE_MS)
    return () => clearInterval(id)
  }, [map])

  return null
}
