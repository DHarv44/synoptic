import { useFeatureOption } from '@/core/settings/store'

export type UnitSystem = 'metric' | 'imperial'

/** The active unit system — a generated setting on the always-on `units` feature. */
export function useUnitSystem(): UnitSystem {
  return useFeatureOption<UnitSystem>('units', 'system')
}
