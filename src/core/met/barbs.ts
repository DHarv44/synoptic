/** Wind-barb composition math, shared by SVG and canvas renderers. */

export const MS_TO_KT = 1.94384

export interface BarbSpec {
  calm: boolean
  flags: number // 50 kt
  fulls: number // 10 kt
  halves: number // 5 kt
}

export function barbSpec(speedKt: number): BarbSpec {
  if (speedKt < 2.5) return { calm: true, flags: 0, fulls: 0, halves: 0 }
  let remaining = Math.round(speedKt / 5) * 5
  const flags = Math.floor(remaining / 50)
  remaining -= flags * 50
  const fulls = Math.floor(remaining / 10)
  remaining -= fulls * 10
  const halves = Math.floor(remaining / 5)
  return { calm: false, flags, fulls, halves }
}
