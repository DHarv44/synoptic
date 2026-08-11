import type { CSSProperties } from 'react'

/**
 * Floating controls sit over map imagery that ranges from near-black to
 * near-white, so the surface is tinted from the theme body colour and
 * blurred rather than given a fixed colour. Works in both schemes.
 */
export const mapChromeStyle: CSSProperties = {
  background: 'color-mix(in srgb, var(--mantine-color-body) 90%, transparent)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  boxShadow: 'var(--mantine-shadow-sm)',
}
