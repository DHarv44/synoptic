import { useFeatureOption } from '@/core/settings/store'

export type UnitSystem = 'metric' | 'imperial'
export type TempUnit = 'C' | 'F'

/** The active unit system — a generated setting on the always-on `units` feature. */
export function useUnitSystem(): UnitSystem {
  return useFeatureOption<UnitSystem>('units', 'system')
}

/**
 * The active temperature unit. Independently switchable from the system:
 * 'auto' follows it, or the user pins °C/°F explicitly.
 */
export function useTempUnit(): TempUnit {
  const system = useUnitSystem()
  const pref = useFeatureOption<string>('units', 'temperature')
  if (pref === 'celsius') return 'C'
  if (pref === 'fahrenheit') return 'F'
  return system === 'imperial' ? 'F' : 'C'
}
