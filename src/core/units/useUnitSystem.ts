import { useMemo } from 'react'
import { useFeatureOption, useFeatureOptions } from '@/core/settings/store'

export type UnitSystem = 'metric' | 'imperial'
export type TempUnit = 'C' | 'F'
export type WindUnit = 'ms' | 'kmh' | 'mph' | 'kt'
export type PressureUnit = 'hPa' | 'inHg'
export type PrecipUnit = 'mm' | 'in'

/**
 * The units every readout displays in. Each is independently switchable —
 * forecasters read wind in knots and pressure in millibars regardless of
 * whether they think in miles — and each defaults to `auto`, following the
 * metric/imperial switch so the simple case stays one control.
 */
export interface Units {
  system: UnitSystem
  temp: TempUnit
  wind: WindUnit
  pressure: PressureUnit
  precip: PrecipUnit
}

/** The active unit system — a generated setting on the always-on `units` feature. */
export function useUnitSystem(): UnitSystem {
  return useFeatureOption<UnitSystem>('units', 'system')
}

function resolve<T extends string>(pref: unknown, auto: T): T {
  return pref === 'auto' || pref === undefined ? auto : (pref as T)
}

export function useUnits(): Units {
  const options = useFeatureOptions('units')
  return useMemo(() => {
    const system = (options.system as UnitSystem) ?? 'metric'
    const imperial = system === 'imperial'
    return {
      system,
      // Temperature predates the others and stores long names; mapping here
      // avoids a settings migration for a value that already works.
      temp:
        options.temperature === 'celsius'
          ? 'C'
          : options.temperature === 'fahrenheit'
            ? 'F'
            : imperial
              ? 'F'
              : 'C',
      wind: resolve<WindUnit>(options.wind, imperial ? 'mph' : 'kmh'),
      pressure: resolve<PressureUnit>(options.pressure, imperial ? 'inHg' : 'hPa'),
      precip: resolve<PrecipUnit>(options.precip, imperial ? 'in' : 'mm'),
    }
  }, [options])
}

/** The active temperature unit; `auto` follows the system. */
export function useTempUnit(): TempUnit {
  return useUnits().temp
}
