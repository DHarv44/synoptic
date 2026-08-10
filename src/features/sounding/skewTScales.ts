/** Coordinate math for the skew-T log-p diagram. */

export const SKEWT = {
  W: 320,
  H: 340,
  ML: 34,
  MR: 10,
  MT: 8,
  MB: 22,
  P_TOP: 100,
  P_BOT: 1050,
  T_MIN: -35, // °C at the bottom axis
  T_MAX: 45,
  /** °C of rightward skew per decade of pressure */
  SKEW: 45,
}

const plotW = SKEWT.W - SKEWT.ML - SKEWT.MR
const plotH = SKEWT.H - SKEWT.MT - SKEWT.MB

export function yOfP(p: number): number {
  const t =
    (Math.log(p) - Math.log(SKEWT.P_BOT)) / (Math.log(SKEWT.P_TOP) - Math.log(SKEWT.P_BOT))
  return SKEWT.MT + t * plotH
}

/** Skewed x for temperature (°C) at pressure p. */
export function xOfTP(tC: number, p: number): number {
  const skewed = tC + SKEWT.SKEW * Math.log10(SKEWT.P_BOT / p)
  const f = (skewed - SKEWT.T_MIN) / (SKEWT.T_MAX - SKEWT.T_MIN)
  return SKEWT.ML + f * plotW
}

export const ISOBARS = [1000, 850, 700, 500, 400, 300, 250, 200, 150, 100]
export const ISOTHERMS = [-80, -70, -60, -50, -40, -30, -20, -10, 0, 10, 20, 30, 40]

/** Dry adiabat polyline points for potential temperature thetaK. */
export function dryAdiabatPath(thetaK: number): Array<[number, number]> {
  const pts: Array<[number, number]> = []
  for (let p = SKEWT.P_BOT; p >= SKEWT.P_TOP; p -= 25) {
    const tC = thetaK * Math.pow(p / 1000, 0.2854) - 273.15
    pts.push([xOfTP(tC, p), yOfP(p)])
  }
  return pts
}

export const DRY_ADIABATS_K = [263, 283, 303, 323, 343, 363, 383, 403]

export function pathFrom(pts: Array<[number, number]>): string {
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join('')
}
