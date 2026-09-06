import { TAB_BAR_HEIGHT } from '@/app/shell/sheetSnap'

/** The playback bar sits just above the tab bar. */
export const MOBILE_PLAYBACK_BOTTOM = TAB_BAR_HEIGHT + 8
const PLAYBACK_HEIGHT = 60
/** Legends and the control column clear the playback bar by a thumb's margin. */
export const MOBILE_CHROME_BOTTOM = MOBILE_PLAYBACK_BOTTOM + PLAYBACK_HEIGHT + 24
