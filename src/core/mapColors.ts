/**
 * Colours for data rendered BY MAPLIBRE, which parses colour strings itself
 * and cannot resolve CSS variables — `var(--mantine-*)` in a paint property
 * or a data-driven `['get','color']` fails validation or renders invisibly.
 * These are the Mantine (open-color) palette values as literal hex, so map
 * layers and panels stay the same hues. DOM/SVG code should keep using the
 * CSS variables directly.
 */
export const MAP_COLORS = {
  gray5: '#adb5bd',
  red5: '#ff6b6b',
  red6: '#fa5252',
  orange5: '#ff922b',
  orange7: '#f76707',
  yellow5: '#fab005',
  green7: '#37b24c',
  blue4: '#4dabf7',
  blue5: '#339af0',
  cyan4: '#3bc9db',
  cyan5: '#22b8cf',
  indigo4: '#748ffc',
  violet5: '#7950f2',
  grape5: '#cc5de8',
  grape6: '#be4bdb',
} as const
