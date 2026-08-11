import { useEffect } from 'react'
import { useFeatureOption } from '@/core/settings/store'
import { CHROME_BG_VAR, DEFAULT_CHROME_OPACITY, chromeBackground } from '@/ui/mapChrome'

/**
 * Publishes the user's map-control opacity as a CSS variable so every
 * floating control picks it up without prop-drilling.
 */
export function useChromeOpacity(): void {
  const opacity = useFeatureOption<number>('interface', 'chromeOpacity')
  useEffect(() => {
    document.documentElement.style.setProperty(
      CHROME_BG_VAR,
      chromeBackground(opacity || DEFAULT_CHROME_OPACITY),
    )
  }, [opacity])
}
