import { STATUS_COLORS, type VolcanoStatus } from '@/features/volcanoes/service'

/**
 * The map symbol for a volcano is a triangle — the convention every hazard
 * chart uses. Four static sprites (one per status), drawn at 2× with a
 * dark halo so they read over terrain and imagery alike.
 */
const SIZE = 30

export function triangleImageId(status: VolcanoStatus): string {
  return `volcano-${status}`
}

export function makeTriangleImage(status: VolcanoStatus): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  const path = (): void => {
    ctx.beginPath()
    ctx.moveTo(SIZE / 2, 5)
    ctx.lineTo(SIZE - 4, SIZE - 6)
    ctx.lineTo(4, SIZE - 6)
    ctx.closePath()
  }
  path()
  ctx.strokeStyle = 'rgba(0,0,0,0.8)'
  ctx.lineWidth = 5
  ctx.stroke()
  path()
  ctx.fillStyle = STATUS_COLORS[status]
  ctx.fill()
  return ctx.getImageData(0, 0, SIZE, SIZE)
}
