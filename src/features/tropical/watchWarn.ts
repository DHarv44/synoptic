/**
 * NHC coastal watches and warnings. The map service codes each segment
 * `tcww`: HWR hurricane warning, HWA hurricane watch, TWR tropical-storm
 * warning, TWA tropical-storm watch. Colours are NHC's own graphic
 * convention — warnings solid, watches dashed — so a hurricane warning
 * can never be read as a routine advisory.
 */
export type WwCode = 'HWR' | 'HWA' | 'TWR' | 'TWA'

export interface WwStyle {
  label: string
  color: string
  warning: boolean
}

export const WW_STYLES: Record<WwCode, WwStyle> = {
  HWR: { label: 'Hurricane Warning', color: '#ff2d2d', warning: true },
  HWA: { label: 'Hurricane Watch', color: '#ff5fa2', warning: false },
  TWR: { label: 'Tropical Storm Warning', color: '#2f7bff', warning: true },
  TWA: { label: 'Tropical Storm Watch', color: '#ffd23f', warning: false },
}

export function isWwCode(code: string): code is WwCode {
  return code in WW_STYLES
}
