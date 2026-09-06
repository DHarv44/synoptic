/**
 * A MapLibre protocol that hands back MRMS accumulation tiles with the
 * "nothing fell" pixels cleared.
 *
 * IEM paints zero accumulation as opaque mid-grey (144,144,144) over land —
 * probed across four CONUS tiles 2026-09-05, the only grey in the palette —
 * so the layer laid a dark wash over every dry state. An accumulation
 * display should show nothing where nothing fell. The real values keep
 * IEM's own palette; only the zero colour goes transparent.
 */

import maplibregl from 'maplibre-gl'

export const PRECIP_PROTOCOL = 'synoptic-precip'

/** IEM's zero-accumulation colour. */
const ZERO_GREY = 144

export function precipUrl(upstream: string): string {
  return `${PRECIP_PROTOCOL}://${upstream}`
}

/** Clear alpha wherever a pixel is the zero-accumulation grey. */
export function clearZeroPrecip(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] === ZERO_GREY && data[i + 1] === ZERO_GREY && data[i + 2] === ZERO_GREY) {
      data[i + 3] = 0
    }
  }
}

let registered = false

export function registerPrecipProtocol(): void {
  if (registered) return
  registered = true

  maplibregl.addProtocol(PRECIP_PROTOCOL, async (params, abortController) => {
    const upstream = params.url.slice(`${PRECIP_PROTOCOL}://`.length)
    const res = await fetch(upstream, { signal: abortController.signal })
    if (!res.ok) throw new Error(`precip tile HTTP ${res.status}`)

    const source = await createImageBitmap(await res.blob())
    try {
      const canvas = new OffscreenCanvas(source.width, source.height)
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) throw new Error('no 2d context for precip tile')
      ctx.drawImage(source, 0, 0)
      const image = ctx.getImageData(0, 0, source.width, source.height)
      clearZeroPrecip(image.data)
      return { data: await createImageBitmap(image), cacheControl: res.headers.get('cache-control') }
    } finally {
      source.close()
    }
  })
}
