/** Basemap styles: OpenFreeMap-hosted (keyless, no usage caps). */

const STYLES = {
  dark: 'https://tiles.openfreemap.org/styles/dark',
  light: 'https://tiles.openfreemap.org/styles/positron',
} as const

export function styleUrl(scheme: 'dark' | 'light'): string {
  return STYLES[scheme]
}
