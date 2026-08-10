/**
 * Parcel thermodynamics (pure functions, SI-ish: °C in/out, hPa, m).
 * Formulas: Bolton (1980) for LCL/theta-e-adjacent quantities; standard
 * pseudoadiabatic lapse integration. Plain temperature (no virtual
 * correction) — stated simplification, consistent for comparison use.
 */

const RD = 287.04 // J/kg/K
const CPD = 1005.7
const LV = 2.501e6
const EPS = 0.622

export function satVaporPressure(tC: number): number {
  // Bolton: e_s in hPa
  return 6.112 * Math.exp((17.67 * tC) / (tC + 243.5))
}

export function mixingRatio(tC: number, pHpa: number): number {
  const e = satVaporPressure(tC)
  return (EPS * e) / (pHpa - e) // kg/kg
}

/** LCL temperature (K) from T and Td in °C — Bolton (1980) eq. 15. */
export function lclTemperatureK(tC: number, tdC: number): number {
  const tK = tC + 273.15
  const tdK = tdC + 273.15
  return 1 / (1 / (tdK - 56) + Math.log(tK / tdK) / 800) + 56
}

/** LCL pressure (hPa) via Poisson from the starting level. */
export function lclPressure(tC: number, tdC: number, pHpa: number): number {
  const tK = tC + 273.15
  const tLclK = lclTemperatureK(tC, tdC)
  return pHpa * Math.pow(tLclK / tK, CPD / RD)
}

/** Pseudoadiabatic dT/dp (K per hPa) at T (K), p (hPa). */
function moistLapseDTdp(tK: number, pHpa: number): number {
  const rs = mixingRatio(tK - 273.15, pHpa)
  const num = (RD * tK + LV * rs) / pHpa
  const den = CPD + (LV * LV * rs * EPS) / (RD * tK * tK)
  return num / den / 100 // per hPa (formula in Pa → hPa)
}

export interface ParcelPath {
  /** parcel temperature (°C) at each requested pressure */
  temps: number[]
  lclP: number
}

/**
 * Lift a parcel (surface T/Td at pStart) dry to the LCL then
 * pseudoadiabatically, returning its temperature at each pressure in
 * `pressures` (must be descending, ≤ pStart).
 */
export function liftParcel(
  tC: number,
  tdC: number,
  pStart: number,
  pressures: number[],
): ParcelPath {
  const lclP = Math.min(lclPressure(tC, tdC, pStart), pStart)
  const tStartK = tC + 273.15
  const temps: number[] = []

  let tK = tStartK
  let p = pStart
  const STEP = 2 // hPa integration step
  let i = 0
  while (i < pressures.length) {
    const target = pressures[i]
    while (p - STEP >= Math.max(target, 0)) {
      const next = p - STEP
      if (next >= lclP) {
        // dry adiabatic via Poisson from current point
        tK = tK * Math.pow(next / p, RD / CPD)
      } else {
        tK -= moistLapseDTdp(tK, p) * STEP * 100
      }
      p = next
    }
    // partial step to land exactly on target
    if (p > target) {
      const dp = p - target
      if (p > lclP) tK = tK * Math.pow(target / p, RD / CPD)
      else tK -= moistLapseDTdp(tK, p) * dp * 100
      p = target
    }
    temps.push(tK - 273.15)
    i++
  }
  return { temps, lclP }
}

export interface CapeResult {
  cape: number // J/kg
  cin: number // J/kg (≤ 0)
  lclP: number
  lfcP: number | null
  elP: number | null
  liftedIndex: number | null // °C at 500 hPa
}

/** Surface-based CAPE/CIN over an environment profile (p desc, T °C). */
export function surfaceCape(
  envP: number[],
  envT: number[],
  sfcT: number,
  sfcTd: number,
): CapeResult {
  const pStart = envP[0]
  const { temps: parcelT, lclP } = liftParcel(sfcT, sfcTd, pStart, envP)
  let cape = 0
  let cin = 0
  let lfcP: number | null = null
  let elP: number | null = null

  for (let i = 0; i < envP.length - 1; i++) {
    const pMid = (envP[i] + envP[i + 1]) / 2
    const dT =
      (parcelT[i] - envT[i] + parcelT[i + 1] - envT[i + 1]) / 2
    const dlnp = Math.log(envP[i] / envP[i + 1])
    const contrib = RD * dT * dlnp // J/kg (T diff in K == °C diff)
    if (contrib > 0) {
      if (lfcP === null) lfcP = envP[i]
      elP = envP[i + 1]
      cape += contrib
    } else if (lfcP === null && pMid < lclP + 50) {
      cin += contrib
    }
  }

  const i500 = envP.findIndex((p) => p === 500)
  const liftedIndex = i500 >= 0 ? envT[i500] - parcelT[i500] : null
  return { cape, cin, lclP, lfcP, elP, liftedIndex }
}

/** Precipitable water (mm) from dewpoint profile. */
export function precipitableWater(envP: number[], envTd: number[]): number {
  let pw = 0
  for (let i = 0; i < envP.length - 1; i++) {
    const r1 = mixingRatio(envTd[i], envP[i])
    const r2 = mixingRatio(envTd[i + 1], envP[i + 1])
    pw += ((r1 + r2) / 2) * (envP[i] - envP[i + 1]) * 100 // kg/m² per (Pa/g)
  }
  return (pw / 9.81) // kg/m² == mm
}
