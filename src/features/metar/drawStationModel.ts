import { barbSpec } from '@/core/met/barbs'
import type { Metar } from '@/features/metar/service'

const SIZE = 96
const CX = SIZE / 2
const CY = SIZE / 2

interface SpriteColors {
  temp: string
  dewp: string
  station: string
}

export const STATION_COLORS: Record<'dark' | 'light', SpriteColors> = {
  dark: { temp: '#ff8787', dewp: '#63e6be', station: '#ced4da' },
  light: { temp: '#c92a2a', dewp: '#087f5b', station: '#343a40' },
}

/** Draw a WMO-style station model (temp, dewpoint, wind barb) to a canvas. */
export function makeStationCanvas(m: Metar, colors: SpriteColors): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

  ctx.strokeStyle = colors.station
  ctx.fillStyle = colors.station
  ctx.lineWidth = 2

  // station circle
  ctx.beginPath()
  ctx.arc(CX, CY, 4, 0, Math.PI * 2)
  ctx.stroke()

  // wind barb (points toward the direction wind comes FROM)
  const dir = typeof m.wdir === 'number' ? m.wdir : null
  if (dir !== null && m.wspd !== null && m.wspd > 0) {
    const spec = barbSpec(m.wspd)
    ctx.save()
    ctx.translate(CX, CY)
    ctx.rotate((dir * Math.PI) / 180)
    ctx.beginPath()
    ctx.moveTo(0, -4)
    ctx.lineTo(0, -34)
    ctx.stroke()
    let pos = -34
    const tick = (len: number, drop: number): void => {
      ctx.beginPath()
      ctx.moveTo(0, pos)
      ctx.lineTo(len, pos - drop)
      ctx.stroke()
      pos += 7
    }
    for (let i = 0; i < spec.flags; i++) {
      ctx.beginPath()
      ctx.moveTo(0, pos)
      ctx.lineTo(11, pos + 3)
      ctx.lineTo(0, pos + 7)
      ctx.closePath()
      ctx.fill()
      pos += 9
    }
    for (let i = 0; i < spec.fulls; i++) tick(12, 5)
    for (let i = 0; i < spec.halves; i++) tick(6, 2.5)
    ctx.restore()
  }

  // temperature (upper-left) and dewpoint (lower-left), whole °C.
  // Finite check, not a null check: AWC ships the odd non-numeric value
  // through these fields and a NaN plots as the literal text "NaN".
  const finite = (v: number | null): v is number => v !== null && Number.isFinite(v)
  ctx.font = 'bold 15px monospace'
  ctx.textAlign = 'right'
  if (finite(m.temp)) {
    ctx.fillStyle = colors.temp
    ctx.fillText(String(Math.round(m.temp)), CX - 8, CY - 8)
  }
  if (finite(m.dewp)) {
    ctx.fillStyle = colors.dewp
    ctx.fillText(String(Math.round(m.dewp)), CX - 8, CY + 18)
  }

  return canvas
}
