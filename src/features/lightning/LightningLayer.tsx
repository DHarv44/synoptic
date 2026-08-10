import { useEffect } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { useMapLayer } from '@/map/useMapLayer'
import { useMapContext } from '@/map/MapView'
import { STRIKE_TTL_MS, connectLightning, strikeBuffer } from '@/features/lightning/service'

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
      m.addSource('lightning', { type: 'geojson', data: toGeojson(Date.now()) })
      m.addLayer({
        id: 'lightning',
        type: 'circle',
        source: 'lightning',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'age'], 0, 5, 0.02, 2.5, 1, 1.5],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'age'],
            0,
            '#ffffff',
            0.05,
            '#ffd43b',
            1,
            '#e8590c',
          ],
          'circle-opacity': ['interpolate', ['linear'], ['get', 'age'], 0, 1, 1, 0.15],
          'circle-blur': 0.4,
        },
      })
      return () => {
        if (m.getLayer('lightning')) m.removeLayer('lightning')
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
