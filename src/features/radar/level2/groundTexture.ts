import { Map as MLMap } from 'maplibre-gl'
import { styleUrl } from '@/map/style'
import { distanceKm } from '@/features/radar/level2/geometry'

const SIZE = 1024

export interface GroundImage {
  canvas: HTMLCanvasElement
  /** Plane dimensions in km matching the rendered extent. */
  widthKm: number
  heightKm: number
}

/**
 * Renders the basemap for a radar's footprint into a plain canvas, for use
 * as the floor of the 3D view. A hidden MapLibre instance draws the extent
 * once, its pixels are copied out, and the instance (and its WebGL
 * context) is destroyed — nothing lingers.
 */
export function renderGroundImage(
  site: { lat: number; lon: number },
  radiusKm: number,
  scheme: 'dark' | 'light',
): Promise<GroundImage> {
  return new Promise((resolve, reject) => {
    const host = document.createElement('div')
    host.style.cssText = `position:absolute;left:-99999px;top:0;width:${SIZE}px;height:${SIZE}px`
    document.body.appendChild(host)

    const dLat = radiusKm / 110.574
    const dLon = radiusKm / (111.32 * Math.cos((site.lat * Math.PI) / 180))
    const map = new MLMap({
      container: host,
      style: styleUrl(scheme),
      interactive: false,
      attributionControl: false,
      // Required to copy pixels back out of the map's canvas.
      canvasContextAttributes: { preserveDrawingBuffer: true },
      bounds: [
        [site.lon - dLon, site.lat - dLat],
        [site.lon + dLon, site.lat + dLat],
      ],
      fitBoundsOptions: { padding: 0, animate: false },
    })

    const cleanup = (): void => {
      map.remove()
      host.remove()
    }

    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('ground render timed out'))
    }, 15_000)

    map.once('idle', () => {
      clearTimeout(timer)
      try {
        // Measure what was actually drawn so the plane matches it exactly.
        const b = map.getBounds()
        const widthKm = distanceKm(
          { lat: site.lat, lon: b.getWest() },
          { lat: site.lat, lon: b.getEast() },
        )
        const heightKm = distanceKm(
          { lat: b.getSouth(), lon: site.lon },
          { lat: b.getNorth(), lon: site.lon },
        )
        const canvas = document.createElement('canvas')
        canvas.width = SIZE
        canvas.height = SIZE
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
        ctx.drawImage(map.getCanvas(), 0, 0, SIZE, SIZE)
        cleanup()
        resolve({ canvas, widthKm, heightKm })
      } catch (e) {
        cleanup()
        reject(e instanceof Error ? e : new Error(String(e)))
      }
    })
  })
}
