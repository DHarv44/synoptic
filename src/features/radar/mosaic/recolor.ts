/**
 * Recolour an IEM mosaic tile through our own reflectivity table.
 *
 * Pure and synchronous: no MapLibre, no network, no canvas. The protocol
 * handler owns the I/O, this owns the pixels.
 */

import { reflectivityLut } from '@/features/radar/level2/colormap'
import { n0qIndexByRgb } from '@/features/radar/mosaic/n0qPalette'

/** Packed 24-bit source RGB → packed little-endian RGBA output. */
export type Translation = Map<number, number>

/**
 * One entry per palette colour, resolved ahead of time: reading a value out
 * of a pixel and colouring it again are the same lookup, so the per-pixel
 * loop never touches dBZ or the ramp.
 */
export function buildTranslation(floorDbz: number): Translation {
  const lut = reflectivityLut(floorDbz)
  const out = new Map<number, number>()
  for (const [rgb, index] of n0qIndexByRgb()) {
    const o = index * 4
    // Little-endian RGBA, matching how Uint32Array views ImageData.
    out.set(rgb, (lut[o + 3] << 24) | (lut[o + 2] << 16) | (lut[o + 1] << 8) | lut[o])
  }
  return out
}

/**
 * Rewrite `pixels` in place. Transparent source pixels stay transparent;
 * opaque ones become our colour for the same reading, or vanish if they fall
 * under the floor.
 *
 * Unrecognised colours are dropped rather than passed through. The palette
 * check proved tiles carry only ramp entries, so anything else is a rendering
 * artifact, and showing it would mean drawing a value we cannot name.
 */
export function recolor(pixels: Uint8ClampedArray, translation: Translation): void {
  const words = new Uint32Array(pixels.buffer, pixels.byteOffset, pixels.length / 4)
  for (let i = 0; i < words.length; i++) {
    const px = words[i]
    // Alpha is binary in these tiles, so the top byte is the whole test.
    if ((px & 0xff000000) === 0) continue
    words[i] = translation.get(((px & 0xff) << 16) | (px & 0xff00) | ((px >>> 16) & 0xff)) ?? 0
  }
}
