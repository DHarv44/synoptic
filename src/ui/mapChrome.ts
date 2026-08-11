import type { CSSProperties } from 'react'

export const CHROME_BG_VAR = '--wx-chrome-bg'
export const DEFAULT_CHROME_OPACITY = 78

/** Background value for a given opacity, tinted from the theme body colour. */
export function chromeBackground(opacityPct: number): string {
  return `color-mix(in srgb, var(--mantine-color-body) ${opacityPct}%, transparent)`
}

/**
 * Floating controls sit over map imagery that ranges from near-black to
 * near-white, so the surface is tinted from the theme body colour and
 * blurred rather than given a fixed colour. Translucency is user-adjustable
 * (Interface settings) via a CSS variable so every control follows in step.
 */
export const mapChromeStyle: CSSProperties = {
  background: `var(${CHROME_BG_VAR}, ${chromeBackground(DEFAULT_CHROME_OPACITY)})`,
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  boxShadow: 'var(--mantine-shadow-sm)',
}
