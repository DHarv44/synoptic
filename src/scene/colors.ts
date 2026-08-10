import { useComputedColorScheme } from '@mantine/core'

export interface SceneColors {
  background: string
  day: string
  night: string
  coastline: string
  graticule: string
  probe: string
}

const DARK: SceneColors = {
  background: '#0b0e12',
  day: '#182230',
  night: '#0a0d12',
  coastline: '#76879a',
  graticule: '#3d4a58',
  probe: '#ffb347',
}

const LIGHT: SceneColors = {
  background: '#eef1f4',
  day: '#dee7ee',
  night: '#aeb8c2',
  coastline: '#41505f',
  graticule: '#8b99a7',
  probe: '#d9480f',
}

/** Scene palette bound to the Mantine color scheme (chrome stays achromatic). */
export function useSceneColors(): SceneColors {
  const scheme = useComputedColorScheme('dark')
  return scheme === 'dark' ? DARK : LIGHT
}
