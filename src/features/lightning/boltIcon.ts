/** Canvas-drawn lightning bolt icons for the strike symbol layer. */

const SIZE = 44

// Classic bolt silhouette, drawn in a 44x44 box.
const BOLT: Array<[number, number]> = [
  [25, 2],
  [10, 25],
  [19, 25],
  [15, 42],
  [35, 17],
  [24, 17],
  [30, 2],
]

export function makeBoltImage(fill: string, glow: string | null): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  if (glow !== null) {
    ctx.shadowColor = glow
    ctx.shadowBlur = 6
  }
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.moveTo(BOLT[0][0], BOLT[0][1])
  for (const [x, y] of BOLT.slice(1)) ctx.lineTo(x, y)
  ctx.closePath()
  ctx.fill()
  return ctx.getImageData(0, 0, SIZE, SIZE)
}
