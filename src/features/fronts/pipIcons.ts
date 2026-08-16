import { MAP_COLORS as C } from '@/core/mapColors'
import type { Front } from '@/core/data/wpc/codsus'

/**
 * Front pips as repeating unit sprites, placed along the line by a symbol
 * layer. With `symbol-placement: 'line'` and map-aligned rotation the
 * sprite's x-axis follows the line, so "up" here means one side of the
 * front and "down" the other. WPC bulletins carry no drawing-direction
 * convention, so which side the pips land on is consistent per front but
 * not guaranteed to match the advance direction — the shapes, not the
 * side, carry the identification.
 *
 * Drawn at 2× and registered with pixelRatio 2.
 */
const W = 56
const H = 28
const R = 9 // pip half-width at 2×

export type PipKind = Exclude<Front['kind'], 'trough'>

export const PIP_KINDS: PipKind[] = ['cold', 'warm', 'stationary', 'occluded']

export function pipImageId(kind: PipKind): string {
  return `front-pip-${kind}`
}

function triangle(ctx: CanvasRenderingContext2D, cx: number, up: boolean, color: string): void {
  const mid = H / 2
  const apex = up ? mid - 12 : mid + 12
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(cx - R, mid)
  ctx.lineTo(cx + R, mid)
  ctx.lineTo(cx, apex)
  ctx.closePath()
  ctx.fill()
}

function semicircle(ctx: CanvasRenderingContext2D, cx: number, up: boolean, color: string): void {
  const mid = H / 2
  ctx.fillStyle = color
  ctx.beginPath()
  if (up) ctx.arc(cx, mid, R, Math.PI, 2 * Math.PI)
  else ctx.arc(cx, mid, R, 0, Math.PI)
  ctx.closePath()
  ctx.fill()
}

export function makePipImage(kind: PipKind): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  switch (kind) {
    case 'cold':
      triangle(ctx, W / 2, true, C.blue5)
      break
    case 'warm':
      semicircle(ctx, W / 2, true, C.red6)
      break
    // Alternating cold/warm shapes on opposite sides: the chart convention.
    case 'stationary':
      triangle(ctx, W * 0.3, true, C.blue5)
      semicircle(ctx, W * 0.7, false, C.red6)
      break
    // Both shapes, same side, one colour.
    case 'occluded':
      triangle(ctx, W * 0.3, true, C.violet5)
      semicircle(ctx, W * 0.7, true, C.violet5)
      break
  }
  return ctx.getImageData(0, 0, W, H)
}
