/**
 * A MapLibre protocol that hands back mosaic tiles in our own colours.
 *
 * Registering a protocol rather than writing a custom layer keeps tiling,
 * caching, overzoom and fading with MapLibre; all we own is the pixels. The
 * display floor travels in the URL so that changing it invalidates cached
 * tiles the same way changing the valid time does — otherwise old colours
 * would linger until the tiles happened to be evicted.
 */

import maplibregl from 'maplibre-gl'
import { buildTranslation, recolor, type Translation } from '@/features/radar/mosaic/recolor'

export const MOSAIC_PROTOCOL = 'synoptic-mosaic'

/** `synoptic-mosaic://<floorDbz>/<upstream url>` */
export function mosaicUrl(upstream: string, floorDbz: number): string {
  return `${MOSAIC_PROTOCOL}://${floorDbz}/${upstream}`
}

function parse(url: string): { floorDbz: number; upstream: string } {
  const rest = url.slice(`${MOSAIC_PROTOCOL}://`.length)
  const cut = rest.indexOf('/')
  return { floorDbz: Number(rest.slice(0, cut)), upstream: rest.slice(cut + 1) }
}

/** Translations are per-floor and tiny; one is alive at a time in practice. */
const translations = new Map<number, Translation>()

function translationFor(floorDbz: number): Translation {
  let t = translations.get(floorDbz)
  if (!t) {
    t = buildTranslation(floorDbz)
    translations.set(floorDbz, t)
  }
  return t
}

let registered = false

export function registerMosaicProtocol(): void {
  if (registered) return
  registered = true

  maplibregl.addProtocol(MOSAIC_PROTOCOL, async (params, abortController) => {
    const { floorDbz, upstream } = parse(params.url)
    const res = await fetch(upstream, { signal: abortController.signal })
    if (!res.ok) throw new Error(`mosaic tile HTTP ${res.status}`)

    const source = await createImageBitmap(await res.blob())
    try {
      const canvas = new OffscreenCanvas(source.width, source.height)
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) throw new Error('no 2d context for mosaic recolour')
      ctx.drawImage(source, 0, 0)

      const image = ctx.getImageData(0, 0, source.width, source.height)
      recolor(image.data, translationFor(floorDbz))
      return { data: await createImageBitmap(image), cacheControl: res.headers.get('cache-control') }
    } finally {
      source.close()
    }
  })
}
