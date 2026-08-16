import { barbSpec } from '@/core/met/barbs'
import { MAP_COLORS as C } from '@/core/mapColors'
import type { Metar } from '@/features/metar/service'

const SIZE = 96
const CX = SIZE / 2
const CY = SIZE / 2

interface SpriteColors {
  temp: string
  dewp: string
  station: string
  /** Contrasting stroke under text and symbols, so plots survive any backdrop. */
  halo: string
}

export const STATION_COLORS: Record<'dark' | 'light', SpriteColors> = {
  dark: { temp: '#ff8787', dewp: '#63e6be', station: '#ced4da', halo: 'rgba(0,0,0,0.8)' },
  light: { temp: '#c92a2a', dewp: '#087f5b', station: '#343a40', halo: 'rgba(255,255,255,0.85)' },
}

/** GFA convention: the station dot wears its flight category. */
const FLTCAT_COLORS: Record<string, string> = {
  VFR: C.green5,
  MVFR: C.blue5,
  IFR: C.red6,
  LIFR: C.grape6,
}

/** Draw a WMO-style station model (temp, dewpoint, wind barb) to a canvas. */
export function makeStationCanvas(
  m: Metar,
  colors: SpriteColors,
  tempUnit: 'C' | 'F' = 'C',
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

  ctx.strokeStyle = colors.station
  ctx.fillStyle = colors.station
  ctx.lineWidth = 2

  // station circle: filled with the flight-category colour when reported,
  // haloed so it reads over bright cloud tops and dark ocean alike.
  const catColor = m.fltCat !== null ? FLTCAT_COLORS[m.fltCat] : undefined
  ctx.beginPath()
  ctx.arc(CX, CY, catColor ? 5 : 4, 0, Math.PI * 2)
  ctx.strokeStyle = colors.halo
  ctx.lineWidth = 4
  ctx.stroke()
  ctx.strokeStyle = colors.station
  ctx.lineWidth = 2
  if (catColor) {
    ctx.fillStyle = catColor
    ctx.fill()
  } else {
    ctx.stroke()
  }
  ctx.fillStyle = colors.station

  // wind barb (points toward the direction wind comes FROM), drawn twice:
  // a fat halo pass then the coloured pass, so it survives bright backdrops.
  const dir = typeof m.wdir === 'number' ? m.wdir : null
  if (dir !== null && m.wspd !== null && m.wspd > 0) {
    const spec = barbSpec(m.wspd)
    const drawBarb = (stroke: string, width: number): void => {
      ctx.save()
      ctx.strokeStyle = stroke
      ctx.fillStyle = stroke
      ctx.lineWidth = width
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
        ctx.stroke()
        pos += 9
      }
      for (let i = 0; i < spec.fulls; i++) tick(12, 5)
      for (let i = 0; i < spec.halves; i++) tick(6, 2.5)
      ctx.restore()
    }
    drawBarb(colors.halo, 4)
    drawBarb(colors.station, 2)
  }

  // temperature (upper-left) and dewpoint (lower-left), whole degrees in
  // the user's unit — AWC serves °C; the display follows Settings.
  // Finite check, not a null check: AWC ships the odd non-numeric value
  // through these fields and a NaN plots as the literal text "NaN".
  const finite = (v: number | null): v is number => v !== null && Number.isFinite(v)
  const display = (c: number): string =>
    String(Math.round(tempUnit === 'F' ? (c * 9) / 5 + 32 : c))
  ctx.font = 'bold 15px monospace'
  ctx.textAlign = 'right'
  ctx.strokeStyle = colors.halo
  ctx.lineWidth = 3
  if (finite(m.temp)) {
    const t = display(m.temp)
    ctx.strokeText(t, CX - 8, CY - 8)
    ctx.fillStyle = colors.temp
    ctx.fillText(t, CX - 8, CY - 8)
  }
  if (finite(m.dewp)) {
    const d = display(m.dewp)
    ctx.strokeText(d, CX - 8, CY + 18)
    ctx.fillStyle = colors.dewp
    ctx.fillText(d, CX - 8, CY + 18)
  }

  return canvas
}
